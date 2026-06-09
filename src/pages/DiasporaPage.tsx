import { useMemo, useState } from 'react'
import { Search, MapPin, Globe2, Home } from 'lucide-react'
import { useStore } from '../store'
import { coordOf, countryOf, project } from '../family/geo'
import type { Person } from '../family/types'
import { PageTitle, PersonChip } from '../ui/ui'

const W = 360
const H = 180
const UNKNOWN = 'Localisation inconnue'

interface Group {
  country: string
  people: Person[]
  cities: Map<string, Person[]>
}

export function DiasporaPage() {
  const persons = useStore((s) => s.persons)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return persons
    return persons.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.village ?? ''} ${p.city ?? ''} ${p.country ?? ''}`.toLowerCase().includes(term),
    )
  }, [persons, q])

  const groups = useMemo(() => {
    const map = new Map<string, Group>()
    for (const p of filtered) {
      const country = countryOf(p.country, p.city) ?? UNKNOWN
      if (!map.has(country)) map.set(country, { country, people: [], cities: new Map() })
      const g = map.get(country)!
      g.people.push(p)
      const city = p.city?.trim() || (country === UNKNOWN ? 'Non renseigné' : 'Ville non précisée')
      if (!g.cities.has(city)) g.cities.set(city, [])
      g.cities.get(city)!.push(p)
    }
    return [...map.values()].sort((a, b) => b.people.length - a.people.length)
  }, [filtered])

  const maxCount = Math.max(1, ...groups.filter((g) => g.country !== UNKNOWN).map((g) => g.people.length))
  const countries = groups.length
  const diaspora = groups.filter((g) => g.country !== UNKNOWN && g.country.toLowerCase() !== 'cameroun')
  const offMap = groups.filter((g) => g.country !== UNKNOWN && !coordOf(g.country))

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Diaspora & géographie" subtitle="Où vit la famille aujourd'hui, du village aux quatre coins du monde." />

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat icon={<Globe2 size={16} />} value={countries} label="pays / zones" />
        <Stat icon={<Home size={16} />} value={filtered.length} label="membres situés" />
        <Stat icon={<MapPin size={16} />} value={diaspora.reduce((n, g) => n + g.people.length, 0)} label="hors Cameroun" />
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un lieu : ville, pays, village…"
          className="w-full rounded-xl border border-line bg-card py-2.5 pl-10 pr-3 text-sm focus:border-sage focus:outline-none"
        />
      </div>

      {/* Carte schématique du monde (projection équirectangulaire) */}
      <div className="overflow-hidden rounded-2xl border border-line bg-brand">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" preserveAspectRatio="xMidYMid meet">
          <rect x={0} y={0} width={W} height={H} fill="#1b3454" />
          {/* graticule */}
          {Array.from({ length: 11 }, (_, i) => i * 30).map((lng) => (
            <line key={`v${lng}`} x1={(lng / 360) * W} y1={0} x2={(lng / 360) * W} y2={H} stroke="#ffffff" strokeOpacity={0.06} strokeWidth={0.5} />
          ))}
          {Array.from({ length: 5 }, (_, i) => i * 30).map((lat) => (
            <line key={`h${lat}`} x1={0} y1={(lat / 180) * H} x2={W} y2={(lat / 180) * H} stroke="#ffffff" strokeOpacity={0.06} strokeWidth={0.5} />
          ))}
          <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#ffffff" strokeOpacity={0.12} strokeWidth={0.6} />
          {/* repères de continents */}
          {([['Afrique', 20, 4], ['Europe', 12, 52], ['Amériques', -95, 40], ['Asie', 90, 45]] as const).map(([label, lng, lat]) => {
            const [x, y] = project(lng, lat, W, H)
            return <text key={label} x={x} y={y} fill="#ffffff" fillOpacity={0.18} fontSize={6} textAnchor="middle">{label}</text>
          })}
          {/* bulles par pays */}
          {groups.map((g) => {
            const co = coordOf(g.country)
            if (!co) return null
            const [x, y] = project(co[0], co[1], W, H)
            const r = 2.5 + Math.sqrt(g.people.length / maxCount) * 11
            const isOrigin = g.country.toLowerCase() === 'cameroun'
            const active = selected === g.country
            return (
              <g key={g.country} className="cursor-pointer" onClick={() => setSelected(active ? null : g.country)}>
                <circle cx={x} cy={y} r={r} fill={isOrigin ? '#c8962e' : '#2e7d6f'} fillOpacity={active ? 0.95 : 0.7} stroke="#fff" strokeOpacity={active ? 0.9 : 0.4} strokeWidth={active ? 1 : 0.5} />
                <text x={x} y={y - r - 1.5} fill="#fff" fontSize={5.5} textAnchor="middle" fontWeight="bold">{g.country} · {g.people.length}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className="mt-2 px-1 text-xs text-faint">
        <span className="text-gold">●</span> origine (Cameroun) · <span className="text-sage">●</span> diaspora · touche une bulle pour filtrer la liste.
        {offMap.length > 0 && <> {offMap.length} zone(s) sans coordonnées sont listées plus bas.</>}
      </p>

      {/* Liste groupée */}
      <div className="mt-4 space-y-3">
        {groups
          .filter((g) => !selected || g.country === selected)
          .map((g) => (
            <section key={g.country} className="overflow-hidden rounded-2xl border border-line bg-card">
              <div className="flex items-center justify-between border-b border-line bg-bg/50 px-4 py-2.5">
                <h2 className="flex items-center gap-2 font-semibold text-primary">
                  <MapPin size={16} className={g.country === UNKNOWN ? 'text-faint' : 'text-sage'} /> {g.country}
                </h2>
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">{g.people.length}</span>
              </div>
              <div className="p-2">
                {[...g.cities.entries()]
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([city, people]) => (
                    <div key={city} className="mb-1.5 last:mb-0">
                      <div className="px-2 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-faint">{city} · {people.length}</div>
                      <div className="divide-y divide-line">
                        {people.map((p) => (
                          <div key={p.id} className="px-1"><PersonChip person={p} size={36} /></div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        {!groups.length && <p className="py-8 text-center text-sm text-faint">Aucun lieu ne correspond à « {q} ».</p>}
      </div>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-sage">{icon}<span className="text-xl font-bold text-ink">{value}</span></div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  )
}
