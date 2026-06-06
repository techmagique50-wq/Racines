import { useMemo } from 'react'
import { useStore } from '../store'
import { useRelationToMe, Avatar } from '../ui/ui'
import type { Person } from '../family/types'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/**
 * Propose les personnes EXISTANTES dont le nom ressemble à ce qui est saisi,
 * pour éviter de recréer un doublon (auto-complétion de l'arbre).
 */
export function NameSuggest({
  firstName,
  lastName,
  excludeIds = [],
  onPick,
}: {
  firstName: string
  lastName: string
  excludeIds?: string[]
  onPick: (p: Person) => void
}) {
  const persons = useStore((s) => s.persons)
  const q = norm(`${firstName} ${lastName}`)

  const matches = useMemo(() => {
    if (q.length < 2) return []
    const ex = new Set(excludeIds)
    return persons
      .filter((p) => !ex.has(p.id) && norm(`${p.firstName} ${p.lastName}`).includes(q))
      .slice(0, 4)
  }, [persons, q, excludeIds])

  if (!matches.length) return null

  return (
    <div className="mt-2 rounded-xl border border-gold/30 bg-gold-soft/50 p-2">
      <div className="px-1 pb-1 text-xs font-medium text-gold">Déjà dans l'arbre ? Relie au lieu de recréer :</div>
      <div className="space-y-1">
        {matches.map((p) => <Row key={p.id} p={p} onPick={onPick} />)}
      </div>
    </div>
  )
}

function Row({ p, onPick }: { p: Person; onPick: (p: Person) => void }) {
  const rel = useRelationToMe(p.id)
  return (
    <button onClick={() => onPick(p)} className="flex w-full items-center gap-2 rounded-lg bg-card px-2 py-1.5 text-left hover:bg-bg">
      <Avatar person={p} size={30} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{p.firstName} {p.lastName}</span>
        <span className="block truncate text-xs text-faint">
          {[rel && rel !== 'toi' ? rel : null, p.city || p.village, p.clan ? `clan ${p.clan}` : null].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-sage">Relier</span>
    </button>
  )
}
