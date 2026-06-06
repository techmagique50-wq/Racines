import { useMemo, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { describeRelationship } from '../family/engine'
import { Avatar, PageTitle } from '../ui/ui'

export function LinkFinderPage() {
  const meId = useStore((s) => s.meId)
  const persons = useStore((s) => s.persons)
  const graph = useStore((s) => s.graph)()
  const sorted = useMemo(() => [...persons].sort((a, b) => a.firstName.localeCompare(b.firstName)), [persons])
  const [aId, setAId] = useState(meId)
  const [bId, setBId] = useState('')

  const A = persons.find((p) => p.id === aId)
  const B = persons.find((p) => p.id === bId)
  const rel = useMemo(() => (aId && bId && aId !== bId ? describeRelationship(graph, aId, bId) : null), [graph, aId, bId])

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Comment suis-je lié·e à…" subtitle="Choisis deux personnes — RACINES calcule le lien exact, côté paternel ou maternel." />

      <div className="flex items-center gap-3">
        <Selector label="Personne A" value={aId} onChange={setAId} options={sorted} />
        <ArrowRight className="shrink-0 text-faint" />
        <Selector label="Personne B" value={bId} onChange={setBId} options={sorted} />
      </div>

      {aId && bId && aId === bId && <p className="mt-6 text-center text-faint">Choisis deux personnes différentes.</p>}

      {rel && A && B && (
        <div className="mt-6 rounded-2xl border border-sage/30 bg-sage-soft/50 p-5">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <Avatar person={A} size={56} />
              <span className="text-xs font-medium text-ink">{A.firstName}</span>
            </div>
            <div className="text-center">
              <Sparkles className="mx-auto mb-1 text-gold" size={20} />
              <div className="rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-white">{rel.label}</div>
              <div className="mt-1 text-[11px] text-muted">de {B.firstName}{rel.byAlliance ? ' (alliance)' : ''}</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Avatar person={B} size={56} />
              <span className="text-xs font-medium text-ink">{B.firstName}</span>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-muted">{rel.explanation}</p>

          {rel.path.length > 1 && (
            <div className="mt-4 border-t border-sage/20 pt-3">
              <div className="mb-2 text-center text-xs font-medium text-faint">Chemin de parenté</div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {rel.path.map((id, i) => {
                  const p = graph.persons.get(id)
                  return (
                    <span key={id} className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 text-xs ring-1 ring-line">
                        <span>{p?.avatar ?? '🧑🏾'}</span>
                        {p?.firstName}
                      </span>
                      {i < rel.path.length - 1 && <span className="text-faint">→</span>}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Selector({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { id: string; firstName: string; lastName: string }[]
}) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm focus:border-sage focus:outline-none">
        <option value="">— choisir —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>
        ))}
      </select>
    </label>
  )
}
