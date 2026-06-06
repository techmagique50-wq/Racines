import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, Sparkles, UserPlus } from 'lucide-react'
import { useMe, useStore } from '../store'
import { parentsOf } from '../family/engine'
import type { Gender } from '../family/types'
import { Avatar, PageTitle } from '../ui/ui'

export function OnboardingPage() {
  const me = useMe()
  const graph = useStore((s) => s.graph)()
  const navigate = useNavigate()

  const myParents = parentsOf(graph, me.id)
  const father = myParents.find((p) => p.gender === 'M')
  const mother = myParents.find((p) => p.gender === 'F')

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Construisons ta lignée" subtitle="Déclare tes parents et grands-parents. RACINES proposera ensuite les proches qui ont déclaré les mêmes ancêtres." />

      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-brand p-4 text-white">
        <Avatar person={me} size={44} />
        <div><div className="text-sm opacity-80">Toi</div><div className="font-bold">{me.firstName} {me.lastName}</div></div>
      </div>

      <Section step={1} title="Tes parents">
        <Slot label="Ton père" person={father} relativeOf={me.id} gender="M" defaultLast={me.lastName} />
        <Slot label="Ta mère" person={mother} relativeOf={me.id} gender="F" />
      </Section>

      <Section step={2} title="Côté paternel" locked={!father} lockMsg="Ajoute d'abord ton père.">
        {father && <GrandparentBlock parent={father} sideLabel="du père" />}
      </Section>

      <Section step={3} title="Côté maternel" locked={!mother} lockMsg="Ajoute d'abord ta mère.">
        {mother && <GrandparentBlock parent={mother} sideLabel="de la mère" />}
      </Section>

      <button onClick={() => navigate('/')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-semibold text-white">
        <Sparkles size={18} /> Terminer — voir mon arbre
      </button>
    </div>
  )
}

function GrandparentBlock({ parent, sideLabel }: { parent: { id: string; lastName: string; gender: Gender }; sideLabel: string }) {
  const graph = useStore((s) => s.graph)()
  const gps = parentsOf(graph, parent.id)
  const gf = gps.find((p) => p.gender === 'M')
  const gm = gps.find((p) => p.gender === 'F')
  // co-épouses du grand-père (autres épouses)
  const gfSpouses = gf ? (graph.spouses.get(gf.id) ?? []).map((i) => graph.persons.get(i)!).filter((p) => p && p.id !== gm?.id) : []

  return (
    <div className="space-y-2">
      <Slot label={`Grand-père ${sideLabel}`} person={gf} relativeOf={parent.id} gender="M" defaultLast={parent.lastName} />
      <Slot label={`Grand-mère ${sideLabel}`} person={gm} relativeOf={parent.id} gender="F" />
      {gf && (
        <div className="ml-3 border-l-2 border-line pl-3">
          {gfSpouses.map((sp) => (
            <div key={sp.id} className="flex items-center gap-2 py-1 text-sm text-muted"><Avatar person={sp} size={28} /> {sp.firstName} {sp.lastName} <span className="text-xs text-faint">(co-épouse)</span></div>
          ))}
          <AddSpouse grandfatherId={gf.id} />
        </div>
      )}
    </div>
  )
}

function Section({ step, title, children, locked, lockMsg }: { step: number; title: string; children: React.ReactNode; locked?: boolean; lockMsg?: string }) {
  return (
    <section className="mb-4 rounded-2xl border border-line bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-primary">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-gold-soft text-xs font-bold text-gold">{step}</span> {title}
      </h2>
      {locked ? <p className="text-sm text-faint">{lockMsg}</p> : <div className="space-y-2">{children}</div>}
    </section>
  )
}

function Slot({ label, person, relativeOf, gender, defaultLast }: { label: string; person?: { id: string; firstName: string; lastName: string }; relativeOf: string; gender: Gender; defaultLast?: string }) {
  if (person)
    return (
      <div className="flex items-center gap-2 rounded-xl bg-sage-soft/50 px-3 py-2 text-sm">
        <Check size={16} className="text-sage" /> <b className="text-ink">{label} :</b> {person.firstName} {person.lastName}
      </div>
    )
  return <AddForm label={label} relativeOf={relativeOf} type="parent" gender={gender} defaultLast={defaultLast} />
}

function AddSpouse({ grandfatherId }: { grandfatherId: string }) {
  return <AddForm label="Ajouter une autre épouse du grand-père" relativeOf={grandfatherId} type="spouse" gender="F" small />
}

function AddForm({ label, relativeOf, type, gender, defaultLast, small }: { label: string; relativeOf: string; type: 'parent' | 'spouse'; gender: Gender; defaultLast?: string; small?: boolean }) {
  const addRelative = useStore((s) => s.addRelative)
  const [open, setOpen] = useState(false)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState(defaultLast ?? '')

  const add = () => {
    if (!first.trim()) return
    addRelative(
      { firstName: first.trim(), lastName: last.trim() || '(inconnu)', gender, state: 'vivant', avatar: gender === 'M' ? '🧑🏾' : '👩🏾' },
      { type, relativeOf, confirmed: true },
    )
    setOpen(false); setFirst(''); setLast(defaultLast ?? '')
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className={`flex items-center gap-2 rounded-xl border border-dashed border-line px-3 text-sm text-muted hover:border-gold hover:text-gold ${small ? 'py-1.5' : 'w-full py-2.5'}`}>
        <Plus size={16} /> {label}
      </button>
    )
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-2 text-xs font-medium text-muted">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <input autoFocus value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Prénom" className="rounded-lg border border-line px-2 py-1.5 text-sm" />
        <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Nom" className="rounded-lg border border-line px-2 py-1.5 text-sm" />
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={add} disabled={!first.trim()} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-sage py-1.5 text-sm font-semibold text-white disabled:opacity-40"><UserPlus size={14} /> Ajouter</button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted">Annuler</button>
      </div>
    </div>
  )
}
