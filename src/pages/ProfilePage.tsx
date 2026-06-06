import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  MapPin, Phone, Briefcase, UserPlus, ShieldCheck, Cake, CheckCircle2, Clock,
  Sparkles, Feather, Quote, Send, Flower2, MessageCircle, Share2,
} from 'lucide-react'
import { inviteMessage, whatsappLink } from '../lib/invite'
import { useStore } from '../store'
import {
  childrenOf, coSpousesOf, describeRelationship, parentsOf, siblingsOf, spousesOf, suggestMatches,
} from '../family/engine'
import { ROLE_LABEL, type Person } from '../family/types'
import { Avatar, Badge, PersonChip, timeAgo } from '../ui/ui'

export function ProfilePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const meId = useStore((s) => s.meId)
  const persons = useStore((s) => s.persons)
  const me = persons.find((p) => p.id === meId)
  const filiations = useStore((s) => s.filiations)
  const unions = useStore((s) => s.unions)
  const tributes = useStore((s) => s.tributes)
  const graph = useStore((s) => s.graph)()
  const confirmFiliation = useStore((s) => s.confirmFiliation)
  const confirmUnion = useStore((s) => s.confirmUnion)
  const addTribute = useStore((s) => s.addTribute)
  const startDirect = useStore((s) => s.startDirect)

  const person = persons.find((p) => p.id === id)
  const suggestions = useMemo(() => (person ? suggestMatches(graph, person.id) : []), [graph, person])
  if (!person) return <p className="text-faint">Personne introuvable.</p>

  const isMe = person.id === meId
  const memoire = person.state === 'memoire'
  const rel = isMe ? null : describeRelationship(graph, meId, person.id)
  const guardian = person.guardianId ? persons.find((p) => p.id === person.guardianId) : undefined

  const parents = parentsOf(graph, person.id)
  const spouses = spousesOf(graph, person.id)
  const coSpouses = coSpousesOf(graph, person.id)
  const children = childrenOf(graph, person.id)
  const siblings = siblingsOf(graph, person.id)
  const personTributes = tributes.filter((t) => t.personId === person.id)

  const pendingFil = filiations.filter((f) => f.status === 'pending' && (f.childId === person.id || f.parentId === person.id))
  const pendingUni = unions.filter((u) => u.status === 'pending' && (u.aId === person.id || u.bId === person.id))

  const now = (tributes.length ? Math.max(...tributes.map((t) => t.createdAt)) : 0) + 60_000

  return (
    <div className="mx-auto max-w-xl">
      {/* En-tête */}
      <div className={`overflow-hidden rounded-2xl border ${memoire ? 'border-terre/30' : 'border-line'} bg-card`}>
        {memoire && <div className="bg-terre/90 py-1.5 text-center text-xs font-semibold tracking-wide text-white">✦ EN MÉMOIRE</div>}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <Avatar person={person} size={76} />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-primary">
                {person.firstName} {person.lastName} {person.isPivot && <span className="text-gold" title="ancêtre-pivot">★</span>}
              </h1>
              {person.nickname && <p className="text-sm text-muted">« {person.nickname} »</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {isMe ? <Badge tone="primary">c'est toi</Badge> : rel && rel.label !== 'lien non établi' && <Badge tone="sage">{rel.label}</Badge>}
                {person.isPivot && <Badge tone="gold">ancêtre-pivot</Badge>}
                {person.role && <Badge tone="neutral">{ROLE_LABEL[person.role].label}</Badge>}
                {person.clan && <Badge tone="neutral">clan {person.clan}</Badge>}
              </div>
            </div>
          </div>

          {!isMe && rel && rel.label !== 'lien non établi' && (
            <p className="mt-3 rounded-xl bg-sage-soft/50 px-3 py-2 text-sm text-muted">{rel.explanation}</p>
          )}

          {person.bio && <p className="mt-3 text-sm text-muted">{person.bio}</p>}

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted">
            {(person.birthYear || person.deathYear) && (
              <span className="flex items-center gap-2"><Cake size={15} className="text-faint" /> {person.birthYear ?? '?'}{person.deathYear ? ` – ${person.deathYear}` : person.birthYear ? '' : ''}</span>
            )}
            {person.lignage && <span className="flex items-center gap-2"><Feather size={15} className="text-faint" /> lignage {person.lignage}</span>}
            {person.profession && <span className="flex items-center gap-2"><Briefcase size={15} className="text-faint" /> {person.profession}</span>}
            {person.village && <span className="flex items-center gap-2"><MapPin size={15} className="text-faint" /> origine : {person.village}</span>}
            {(person.city || person.country) && <span className="flex items-center gap-2"><MapPin size={15} className="text-faint" /> {[person.city, person.country].filter(Boolean).join(', ')}</span>}
            {person.phone && !memoire && <span className="flex items-center gap-2"><Phone size={15} className="text-faint" /> {person.phone}</span>}
          </div>

          {guardian && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-gold-soft/60 px-3 py-2 text-xs text-muted">
              <ShieldCheck size={15} className="text-gold" /> Gardien : <Link to={`/membre/${guardian.id}`} className="font-medium text-primary">{guardian.firstName} {guardian.lastName}</Link>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {!isMe && !memoire && (
              <button onClick={() => navigate(`/messages/${startDirect(person.id)}`)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sage px-3 py-2 text-sm font-semibold text-white">
                <MessageCircle size={16} /> Discuter
              </button>
            )}
            {!isMe && (
              <button onClick={() => navigate(`/lien`)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white">
                <Sparkles size={16} /> Notre lien
              </button>
            )}
            <button onClick={() => navigate(`/ajouter?relativeOf=${person.id}`)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-bg px-3 py-2 text-sm font-semibold text-primary ring-1 ring-line">
              <UserPlus size={16} /> Ajouter
            </button>
            {!isMe && (
              <a
                href={whatsappLink(
                  inviteMessage(me?.lastName ?? '', me?.firstName ?? 'Un proche', rel && rel.label !== 'lien non établi' ? rel.label : undefined),
                  person.phone,
                )}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-bg px-3 py-2 text-sm font-semibold text-sage ring-1 ring-line"
              >
                <Share2 size={16} /> Inviter
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Liens en attente */}
      {(pendingFil.length > 0 || pendingUni.length > 0) && (
        <section className="mt-4 rounded-2xl border border-gold/40 bg-gold-soft/50 p-4">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gold"><Clock size={16} /> Liens à confirmer</h2>
          <p className="mb-3 text-xs text-muted">Validation par un aîné (gardien) : un lien n'est réel qu'une fois confirmé.</p>
          <div className="space-y-2">
            {pendingFil.map((f) => {
              const other = persons.find((p) => p.id === (f.childId === person.id ? f.parentId : f.childId))
              const role = f.parentId === person.id ? 'parent de' : 'enfant de'
              return (
                <div key={f.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2">
                  <span className="text-sm text-muted">{person.firstName} serait <b>{role}</b> {other?.firstName} {other?.lastName}</span>
                  <button onClick={() => confirmFiliation(f.id)} className="flex items-center gap-1 rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-white"><CheckCircle2 size={14} /> Confirmer</button>
                </div>
              )
            })}
            {pendingUni.map((u) => {
              const other = persons.find((p) => p.id === (u.aId === person.id ? u.bId : u.aId))
              return (
                <div key={u.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2">
                  <span className="text-sm text-muted">Union avec {other?.firstName} {other?.lastName}</span>
                  <button onClick={() => confirmUnion(u.id)} className="flex items-center gap-1 rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-white"><CheckCircle2 size={14} /> Confirmer</button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Page mémoire : hommages */}
      {memoire && (
        <section className="mt-4 rounded-2xl border border-terre/30 bg-terre-soft/40 p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-terre"><Flower2 size={18} /> Mémoire & hommages</h2>
          <div className="space-y-3">
            {personTributes.map((t) => (
              <div key={t.id} className="rounded-xl bg-card p-3 ring-1 ring-terre/15">
                <Quote size={14} className="text-terre" />
                <p className="mt-1 text-sm italic text-ink">{t.text}</p>
                <p className="mt-1 text-xs text-faint">— {t.authorName} · {timeAgo(t.createdAt, now)}</p>
              </div>
            ))}
            {!personTributes.length && <p className="text-sm text-muted">Sois le premier à partager un souvenir.</p>}
          </div>
          <TributeForm onAdd={(text) => addTribute(person.id, 'temoignage', usersName(persons, meId), text)} />
        </section>
      )}

      {/* Parenté */}
      <RelGroup title="Parents" people={parents} />
      <RelGroup title="Conjoint·e·s" people={spouses} />
      {coSpouses.length > 0 && <RelGroup title="Co-épouses / co-époux" people={coSpouses} />}
      <RelGroup title="Frères & sœurs" people={siblings.map((s) => s.person)} />
      <RelGroup title="Enfants" people={children} />

      {/* Suggestions de rapprochement (matching) */}
      {suggestions.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-faint">
            <Sparkles size={14} className="text-gold" /> Rapprochements possibles
          </h2>
          <div className="space-y-2">
            {suggestions.map((m) => (
              <Link key={m.person.id} to={`/membre/${m.person.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3">
                <Avatar person={m.person} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{m.person.firstName} {m.person.lastName}</div>
                  <div className="truncate text-xs text-faint">{m.reasons.join(' · ')}</div>
                </div>
                <span className="shrink-0 rounded-full bg-gold-soft px-2 py-1 text-xs font-bold text-gold">{m.score}%</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function usersName(persons: Person[], meId: string): string {
  const me = persons.find((p) => p.id === meId)
  return me ? `${me.firstName} ${me.lastName}` : 'Moi'
}

function TributeForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onAdd(text.trim()); setText('') } }}
        placeholder="Partage un souvenir, une parole…"
        className="flex-1 rounded-full bg-card px-4 py-2 text-sm ring-1 ring-terre/20 focus:outline-none"
      />
      <button onClick={() => { if (text.trim()) { onAdd(text.trim()); setText('') } }} className="rounded-full bg-terre p-2.5 text-white"><Send size={16} /></button>
    </div>
  )
}

function RelGroup({ title, people }: { title: string; people: Person[] }) {
  if (!people.length) return null
  return (
    <section className="mt-4">
      <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-faint">{title}</h2>
      <div className="divide-y divide-line rounded-2xl border border-line bg-card">
        {people.map((p) => (
          <div key={p.id} className="px-2 py-1"><PersonChip person={p} size={40} /></div>
        ))}
      </div>
    </section>
  )
}
