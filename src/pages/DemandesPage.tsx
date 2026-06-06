import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, GitMerge, MessageCircle, ShieldCheck, UserCheck, X } from 'lucide-react'
import { useMe, useStore } from '../store'
import { duplicatePairs, matchScore } from '../family/engine'
import type { Person } from '../family/types'
import { Avatar, Badge, PageTitle } from '../ui/ui'

export function DemandesPage() {
  const me = useMe()
  const persons = useStore((s) => s.persons)
  const filiations = useStore((s) => s.filiations)
  const unions = useStore((s) => s.unions)
  const graph = useStore((s) => s.graph)()
  const isGardien = me.role === 'gardien'

  const pending = useMemo(() => {
    return persons.filter((p) => {
      const inPending =
        filiations.some((f) => (f.childId === p.id || f.parentId === p.id) && f.status === 'pending') ||
        unions.some((u) => (u.aId === p.id || u.bId === p.id) && u.status === 'pending')
      const inConfirmed =
        filiations.some((f) => (f.childId === p.id || f.parentId === p.id) && f.status === 'confirmed') ||
        unions.some((u) => (u.aId === p.id || u.bId === p.id) && u.status === 'confirmed')
      return (inPending && !inConfirmed) || p.role === 'attente'
    })
  }, [persons, filiations, unions])

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Demandes d'adhésion" subtitle="Vérifie l'identité avant d'ajouter — au Cameroun les noms se ressemblent souvent." />

      {!isGardien && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold-soft/60 px-3 py-2 text-sm text-muted">
          <ShieldCheck size={16} className="text-gold" /> Seuls les <b className="text-ink">aînés (gardiens)</b> peuvent valider. Connecte-toi en gardien (ex. marguerite@famille.cm) pour approuver.
        </div>
      )}

      <div className="space-y-4">
        {pending.map((p) => (
          <RequestCard key={p.id} person={p} canValidate={isGardien} graphMatch={(cand: Person) => matchScore(graph, p, cand)} />
        ))}
        {!pending.length && (
          <div className="rounded-2xl border border-line bg-card p-8 text-center text-sm text-faint">
            <UserCheck size={28} className="mx-auto mb-2 text-sage" /> Aucune demande en attente. Tout est validé ✅
          </div>
        )}
      </div>

      <MergeSection isGardien={isGardien} />
    </div>
  )
}

function MergeSection({ isGardien }: { isGardien: boolean }) {
  const graph = useStore((s) => s.graph)()
  const mergePersons = useStore((s) => s.mergePersons)
  const startDirect = useStore((s) => s.startDirect)
  const navigate = useNavigate()
  const pairs = useMemo(() => duplicatePairs(graph), [graph])
  if (!pairs.length) return null

  const degree = (id: string) =>
    (graph.parents.get(id)?.length ?? 0) + (graph.children.get(id)?.length ?? 0) + (graph.spouses.get(id)?.length ?? 0)

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-primary">
        <GitMerge size={16} className="text-gold" /> Branches à rapprocher
      </h2>
      <p className="mb-3 px-1 text-xs text-muted">Ces fiches désignent peut-être le même ancêtre saisi par deux branches. Vérifie, puis fusionne.</p>
      <div className="space-y-3">
        {pairs.map(({ a, b, score, reasons }) => {
          const keep = degree(a.id) >= degree(b.id) ? a : b
          const drop = keep.id === a.id ? b : a
          return (
            <article key={`${a.id}-${b.id}`} className="rounded-2xl border border-gold/30 bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Avatar person={a} size={36} /><span className="text-sm font-medium text-ink">{a.firstName} {a.lastName}</span></div>
                <span className="rounded-full bg-gold-soft px-2 py-1 text-xs font-bold text-gold">{score}%</span>
                <div className="flex items-center gap-2"><span className="text-sm font-medium text-ink">{b.firstName} {b.lastName}</span><Avatar person={b} size={36} /></div>
              </div>
              <p className="mt-2 text-center text-xs text-faint">{reasons.join(' · ')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => navigate(`/messages/${startDirect(drop.id)}`)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-bg px-3 py-2 text-sm font-semibold text-primary ring-1 ring-line">
                  <MessageCircle size={16} /> Discuter
                </button>
                {isGardien ? (
                  <button
                    onClick={() => { if (confirm(`Fusionner « ${drop.firstName} ${drop.lastName} » dans « ${keep.firstName} ${keep.lastName} » ? Cette action regroupe les deux branches.`)) mergePersons(keep.id, drop.id) }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sage px-3 py-2 text-sm font-semibold text-white"
                  >
                    <GitMerge size={16} /> Fusionner
                  </button>
                ) : (
                  <span className="flex flex-1 items-center justify-center rounded-xl bg-bg px-3 py-2 text-xs text-faint">Fusion réservée aux aînés</span>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RequestCard({ person, canValidate, graphMatch }: { person: Person; canValidate: boolean; graphMatch: (c: Person) => { person: Person; score: number; reasons: string[] } }) {
  const navigate = useNavigate()
  const persons = useStore((s) => s.persons)
  const filiations = useStore((s) => s.filiations)
  const unions = useStore((s) => s.unions)
  const approve = useStore((s) => s.approveMember)
  const refuse = useStore((s) => s.refuseMember)
  const startDirect = useStore((s) => s.startDirect)

  // lien(s) proposé(s)
  const proposed: string[] = []
  for (const f of filiations) {
    if (f.status !== 'pending') continue
    if (f.childId === person.id) { const o = persons.find((x) => x.id === f.parentId); if (o) proposed.push(`enfant de ${o.firstName} ${o.lastName}`) }
    if (f.parentId === person.id) { const o = persons.find((x) => x.id === f.childId); if (o) proposed.push(`parent de ${o.firstName} ${o.lastName}`) }
  }
  for (const u of unions) {
    if (u.status !== 'pending') continue
    if (u.aId === person.id || u.bId === person.id) { const o = persons.find((x) => x.id === (u.aId === person.id ? u.bId : u.aId)); if (o) proposed.push(`conjoint·e de ${o.firstName} ${o.lastName}`) }
  }

  // homonymes possibles (parmi les membres déjà confirmés)
  const homonyms = useMemo(() => {
    const confirmedIds = new Set<string>()
    for (const f of filiations) if (f.status === 'confirmed') { confirmedIds.add(f.childId); confirmedIds.add(f.parentId) }
    for (const u of unions) if (u.status === 'confirmed') { confirmedIds.add(u.aId); confirmedIds.add(u.bId) }
    return persons
      .filter((c) => c.id !== person.id && confirmedIds.has(c.id))
      .map((c) => graphMatch(c))
      .filter((m) => m.score >= 30 && m.reasons.some((r) => r.includes('nom') || r.includes('prénom') || r.includes('village')))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [persons, filiations, unions, person.id, graphMatch])

  return (
    <article className="rounded-2xl border border-gold/30 bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar person={person} size={52} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-ink">{person.firstName} {person.lastName} <Badge tone="gold">en attente</Badge></div>
          <div className="mt-0.5 text-xs text-muted">
            {[person.birthYear ? `né·e v. ${person.birthYear}` : null, person.city || person.village, person.clan ? `clan ${person.clan}` : null, person.phone].filter(Boolean).join(' · ')}
          </div>
          {proposed.length > 0 && <div className="mt-1 text-sm text-sage">Serait : {proposed.join(', ')}</div>}
        </div>
      </div>

      {homonyms.length > 0 && (
        <div className="mt-3 rounded-xl border border-terre/30 bg-terre-soft/50 p-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-terre"><AlertTriangle size={15} /> Homonymes possibles — vérifie bien</div>
          <div className="mt-2 space-y-1">
            {homonyms.map((h) => (
              <div key={h.person.id} className="flex items-center justify-between text-xs">
                <span className="text-ink">{h.person.firstName} {h.person.lastName}</span>
                <span className="text-faint">{h.reasons.join(' · ')}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">💬 Discute avec la personne pour lever le doute avant d'ajouter.</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => navigate(`/messages/${startDirect(person.id)}`)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-bg px-3 py-2 text-sm font-semibold text-primary ring-1 ring-line">
          <MessageCircle size={16} /> Discuter
        </button>
        {canValidate ? (
          <>
            <button onClick={() => approve(person.id)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sage px-3 py-2 text-sm font-semibold text-white">
              <Check size={16} /> Approuver
            </button>
            <button onClick={() => refuse(person.id)} className="flex items-center justify-center gap-2 rounded-xl bg-terre/10 px-3 py-2 text-sm font-semibold text-terre">
              <X size={16} /> Refuser
            </button>
          </>
        ) : (
          <span className="flex flex-1 items-center justify-center rounded-xl bg-bg px-3 py-2 text-xs text-faint">Validation réservée aux aînés</span>
        )}
      </div>
    </article>
  )
}
