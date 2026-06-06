import { Link } from 'react-router-dom'
import type { Person } from '../family/types'
import { describeRelationship } from '../family/engine'
import { useStore } from '../store'

export function Avatar({ person, size = 44 }: { person?: Person; size?: number }) {
  if (!person)
    return (
      <span style={{ width: size, height: size }} className="inline-flex items-center justify-center rounded-full bg-line text-faint">
        ?
      </span>
    )
  const memoire = person.state === 'memoire'
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      className={`inline-flex select-none items-center justify-center rounded-full ring-1 ${
        memoire ? 'bg-terre-soft ring-terre/30 grayscale-[0.3]' : 'bg-primary-soft ring-primary/15'
      }`}
      title={`${person.firstName} ${person.lastName}`}
    >
      {person.avatar ?? `${person.firstName[0] ?? ''}${person.lastName[0] ?? ''}`}
    </span>
  )
}

export function useRelationToMe(id: string): string | null {
  const meId = useStore((s) => s.meId)
  const graph = useStore((s) => s.graph)()
  if (id === meId) return 'toi'
  const r = describeRelationship(graph, meId, id)
  return r.label === 'lien non établi' ? null : r.label
}

export function PersonChip({ person, size = 44 }: { person: Person; size?: number }) {
  const rel = useRelationToMe(person.id)
  return (
    <Link to={`/membre/${person.id}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-bg">
      <Avatar person={person} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">
          {person.firstName} {person.lastName}
          {person.state === 'memoire' && <span className="ml-1 text-terre" title="en mémoire">✦</span>}
        </span>
        <span className="block truncate text-xs text-muted">
          {rel && rel !== 'toi' ? <span className="text-sage">{rel}</span> : null}
          {rel && rel !== 'toi' && (person.city || person.clan) ? ' · ' : ''}
          {person.city ?? (person.clan ? `clan ${person.clan}` : '')}
        </span>
      </span>
    </Link>
  )
}

export function Badge({
  children,
  tone = 'primary',
}: {
  children: React.ReactNode
  tone?: 'primary' | 'gold' | 'sage' | 'terre' | 'neutral'
}) {
  const map: Record<string, string> = {
    primary: 'bg-primary-soft text-primary',
    gold: 'bg-gold-soft text-gold',
    sage: 'bg-sage-soft text-sage',
    terre: 'bg-terre-soft text-terre',
    neutral: 'bg-line text-muted',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-primary">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
    </div>
  )
}

export function timeAgo(ts: number, now: number): string {
  const d = Math.round(Math.max(0, now - ts) / 86_400_000)
  if (d === 0) return "aujourd'hui"
  if (d === 1) return 'hier'
  if (d < 30) return `il y a ${d} j`
  const m = Math.round(d / 30)
  return `il y a ${m} mois`
}
