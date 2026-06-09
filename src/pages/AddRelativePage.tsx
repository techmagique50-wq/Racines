import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Info, UserPlus } from 'lucide-react'
import { useStore } from '../store'
import { familyScope, isBoundary, spousesOf } from '../family/engine'
import type { Gender, LifeState } from '../family/types'
import { Avatar, PageTitle } from '../ui/ui'
import { NameSuggest } from '../components/NameSuggest'

type RelType = 'parent' | 'child' | 'spouse'
const REL_LABEL: Record<RelType, string> = { parent: 'le parent', child: "l'enfant", spouse: 'le/la conjoint·e' }

export function AddRelativePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const persons = useStore((s) => s.persons)
  const meId = useStore((s) => s.meId)
  const graph = useStore((s) => s.graph)()
  const addRelative = useStore((s) => s.addRelative)
  const linkExisting = useStore((s) => s.linkExisting)

  const [relativeOf, setRelativeOf] = useState(params.get('relativeOf') ?? meId)
  const [type, setType] = useState<RelType>('parent')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<Gender>('M')
  const [state, setState] = useState<LifeState>('vivant')
  const [clan, setClan] = useState('')
  const [lignage, setLignage] = useState('')
  const [village, setVillage] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')

  const guest = useStore((s) => s.guest)
  const anchor = persons.find((p) => p.id === relativeOf)

  // Périmètre : on ne construit pas la famille à partir d'un conjoint entré par
  // alliance (sa belle-famille appartient à une autre lignée).
  const scope = useMemo(() => familyScope(graph, meId), [graph, meId])
  const anchorIsBoundary = relativeOf ? isBoundary(scope, relativeOf) : false
  const bloodSpouse = anchor ? spousesOf(graph, anchor.id).find((s) => scope.blood.has(s.id)) : undefined

  const submit = () => {
    if (anchorIsBoundary || !firstName.trim() || !lastName.trim()) return
    const id = addRelative(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        state,
        clan: clan.trim() || undefined,
        lignage: lignage.trim() || undefined,
        village: village.trim() || undefined,
        city: city.trim() || undefined,
        phone: phone.trim() || undefined,
        avatar: state === 'memoire' ? '✦' : gender === 'M' ? '🧑🏾' : '👩🏾',
        guardianId: state === 'memoire' ? meId : undefined,
      },
      { type, relativeOf },
    )
    navigate(`/membre/${id}`)
  }

  if (guest) return <Navigate to="/signup" replace />

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Ajouter un proche" subtitle="On rattache toujours à quelqu'un déjà présent." />

      <div className="mb-4 flex gap-3 rounded-2xl border border-gold/30 bg-gold-soft/50 p-3 text-sm text-muted">
        <Info size={18} className="mt-0.5 shrink-0 text-gold" />
        <p>Le lien sera <b>en attente</b> jusqu'à <b>validation par un aîné (gardien)</b>. C'est ce qui garantit l'authenticité de l'appartenance.</p>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <label className="block text-xs font-medium text-muted">Rattacher à</label>
        <div className="mt-1 flex items-center gap-3">
          <Avatar person={anchor} size={40} />
          <select value={relativeOf} onChange={(e) => setRelativeOf(e.target.value)} className="flex-1 rounded-xl border border-line px-3 py-2 text-sm">
            {[...persons].sort((a, b) => a.firstName.localeCompare(b.firstName)).map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
            ))}
          </select>
        </div>

        {anchorIsBoundary ? (
          <div className="mt-3 rounded-xl border border-terre/40 bg-terre-soft/50 p-3 text-sm">
            <div className="flex items-center gap-1.5 font-semibold text-terre"><AlertTriangle size={15} /> Personne entrée par alliance</div>
            <p className="mt-1 text-muted">
              <b className="text-ink">{anchor?.firstName} {anchor?.lastName}</b> fait partie de la famille <b>par alliance</b> (belle-famille). On ne construit pas sa lignée ici : elle appartient à une autre famille.
            </p>
            {bloodSpouse && (
              <button onClick={() => setRelativeOf(bloodSpouse.id)} className="mt-2 rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-white">
                Rattacher plutôt à {bloodSpouse.firstName} {bloodSpouse.lastName} (de la lignée)
              </button>
            )}
          </div>
        ) : (
          <>
            <label className="mt-4 block text-xs font-medium text-muted">La nouvelle personne est…</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(['parent', 'child', 'spouse'] as RelType[]).map((t) => (
                <button key={t} onClick={() => setType(t)} className={`rounded-xl border px-2 py-2 text-sm font-medium ${type === t ? 'border-sage bg-sage-soft text-sage' : 'border-line text-muted'}`}>
                  {REL_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-faint">{firstName || 'La personne'} sera {REL_LABEL[type]} de {anchor?.firstName}.</p>
          </>
        )}
      </div>

      <div className="mt-4 space-y-3 rounded-2xl border border-line bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom *" value={firstName} onChange={setFirstName} />
          <Field label="Nom *" value={lastName} onChange={setLastName} />
        </div>
        <NameSuggest
          firstName={firstName}
          lastName={lastName}
          excludeIds={[relativeOf]}
          onPick={(p) => { if (anchorIsBoundary) return; linkExisting(p.id, { type, relativeOf }); navigate(`/membre/${p.id}`) }}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Sexe</label>
            <div className="flex gap-2">
              {(['M', 'F'] as Gender[]).map((g) => (
                <button key={g} onClick={() => setGender(g)} className={`flex-1 rounded-xl border px-2 py-2 text-sm ${gender === g ? 'border-sage bg-sage-soft text-sage' : 'border-line'}`}>{g === 'M' ? 'Homme' : 'Femme'}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">État</label>
            <div className="flex gap-2">
              {(['vivant', 'memoire'] as LifeState[]).map((s) => (
                <button key={s} onClick={() => setState(s)} className={`flex-1 rounded-xl border px-2 py-2 text-sm ${state === s ? 'border-terre bg-terre-soft text-terre' : 'border-line'}`}>{s === 'vivant' ? 'Vivant·e' : '✦ Mémoire'}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Clan" value={clan} onChange={setClan} />
          <Field label="Lignage" value={lignage} onChange={setLignage} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Village d'origine" value={village} onChange={setVillage} />
          <Field label="Ville de résidence" value={city} onChange={setCity} />
        </div>
        {state === 'vivant' && <Field label="Téléphone (WhatsApp)" value={phone} onChange={setPhone} placeholder="+237…" />}
      </div>

      <button onClick={submit} disabled={anchorIsBoundary || !firstName.trim() || !lastName.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 font-semibold text-white transition hover:brightness-95 disabled:opacity-40">
        <UserPlus size={18} /> Ajouter (lien en attente)
      </button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:border-sage focus:outline-none" />
    </label>
  )
}
