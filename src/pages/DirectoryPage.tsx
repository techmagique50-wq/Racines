import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useStore } from '../store'
import { PageTitle, PersonChip } from '../ui/ui'

type Filter = 'tous' | 'vivant' | 'memoire'

export function DirectoryPage() {
  const persons = useStore((s) => s.persons)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('tous')

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return [...persons]
      .filter((p) => filter === 'tous' || p.state === filter)
      .filter(
        (p) =>
          !term ||
          `${p.firstName} ${p.lastName} ${p.nickname ?? ''} ${p.village ?? ''} ${p.city ?? ''} ${p.clan ?? ''} ${p.profession ?? ''}`
            .toLowerCase()
            .includes(term),
      )
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [persons, q, filter])

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Membres de la famille" subtitle={`${persons.length} personnes dans l'arbre`} />

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par nom, surnom, village, clan, métier…"
          className="w-full rounded-xl border border-line bg-card py-2.5 pl-10 pr-3 text-sm focus:border-sage focus:outline-none"
        />
      </div>

      <div className="mb-3 flex gap-2">
        {(['tous', 'vivant', 'memoire'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f ? 'bg-brand text-white' : 'bg-card text-muted ring-1 ring-line'
            }`}
          >
            {f === 'tous' ? 'Tous' : f === 'vivant' ? 'Vivants' : '✦ En mémoire'}
          </button>
        ))}
      </div>

      <div className="divide-y divide-line rounded-2xl border border-line bg-card">
        {list.map((p) => (
          <div key={p.id} className="px-2 py-1">
            <PersonChip person={p} />
          </div>
        ))}
        {!list.length && <p className="p-6 text-center text-sm text-faint">Aucun résultat.</p>}
      </div>
    </div>
  )
}
