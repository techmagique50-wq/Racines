import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useMe, useStore } from '../store'
import { parentsOf } from '../family/engine'
import { completeness } from '../family/profile'
import { Avatar, PageTitle } from '../ui/ui'

const AVATARS = ['🧑🏾', '👩🏾', '🧔🏾', '👨🏾', '👩🏾‍🦱', '🧓🏾', '👵🏾', '👴🏾', '🌳']

export function EditProfilePage() {
  const me = useMe()
  const graph = useStore((s) => s.graph)()
  const updatePerson = useStore((s) => s.updatePerson)
  const navigate = useNavigate()

  const [avatar, setAvatar] = useState(me.avatar ?? '🧑🏾')
  const [birthYear, setBirthYear] = useState(me.birthYear?.toString() ?? '')
  const [profession, setProfession] = useState(me.profession ?? '')
  const [city, setCity] = useState(me.city ?? '')
  const [country, setCountry] = useState(me.country ?? '')
  const [village, setVillage] = useState(me.village ?? '')
  const [clan, setClan] = useState(me.clan ?? '')
  const [lignage, setLignage] = useState(me.lignage ?? '')
  const [phone, setPhone] = useState(me.phone ?? '')
  const [bio, setBio] = useState(me.bio ?? '')

  const draft = { ...me, avatar, birthYear: birthYear ? Number(birthYear) : undefined, profession, city, country, village, clan, lignage, phone, bio }
  const { pct } = completeness(draft, parentsOf(graph, me.id).length)

  const save = () => {
    updatePerson(me.id, {
      avatar,
      birthYear: birthYear ? Number(birthYear) : undefined,
      profession: profession.trim() || undefined,
      city: city.trim() || undefined,
      country: country.trim() || undefined,
      village: village.trim() || undefined,
      clan: clan.trim() || undefined,
      lignage: lignage.trim() || undefined,
      phone: phone.trim() || undefined,
      bio: bio.trim() || undefined,
    })
    navigate(`/membre/${me.id}`)
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Compléter mon profil" subtitle="Plus ton profil est riche, plus tes proches te reconnaissent." />

      {/* jauge de complétude */}
      <div className="mb-4 rounded-2xl border border-line bg-card p-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Complétude</span>
          <span className="font-bold text-sage">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-line bg-card p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Avatar</label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button key={a} onClick={() => setAvatar(a)} className={`grid h-10 w-10 place-items-center rounded-xl text-xl ring-1 ${avatar === a ? 'bg-sage-soft ring-sage' : 'bg-bg ring-line'}`}>{a}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Année de naissance" value={birthYear} onChange={setBirthYear} type="number" />
          <Field label="Profession" value={profession} onChange={setProfession} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ville" value={city} onChange={setCity} />
          <Field label="Pays" value={country} onChange={setCountry} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Village d'origine" value={village} onChange={setVillage} />
          <Field label="Téléphone" value={phone} onChange={setPhone} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Clan" value={clan} onChange={setClan} />
          <Field label="Lignage" value={lignage} onChange={setLignage} />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Biographie</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-line px-3 py-2 text-sm focus:border-sage focus:outline-none" />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Avatar person={{ ...me, avatar } as never} size={44} />
        <button onClick={save} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sage py-3 font-semibold text-white"><Check size={18} /> Enregistrer</button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:border-sage focus:outline-none" />
    </label>
  )
}
