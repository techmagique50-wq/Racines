import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Network, GitCompareArrows, Users, Sparkles, Quote, TreePine, UserPlus, Share2, ArrowRight } from 'lucide-react'
import { useMe, useStore } from '../store'
import { generationLevels, suggestMatches } from '../family/engine'
import { completeness } from '../family/profile'
import { inviteMessage, whatsappLink } from '../lib/invite'
import { Avatar, timeAgo } from '../ui/ui'

export function HomePage() {
  const me = useMe()
  const persons = useStore((s) => s.persons)
  const tributes = useStore((s) => s.tributes)
  const graph = useStore((s) => s.graph)()

  const stats = useMemo(() => {
    const vivants = persons.filter((p) => p.state === 'vivant').length
    const memoire = persons.length - vivants
    const gens = Math.max(...[...generationLevels(graph).values()]) + 1
    const clan = persons.find((p) => p.isPivot)?.clan ?? me.clan
    return { total: persons.length, vivants, memoire, gens, clan }
  }, [persons, graph, me])

  const suggestions = useMemo(() => suggestMatches(graph, me.id, 35), [graph, me.id])
  const recent = useMemo(() => [...tributes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3), [tributes])
  const now = (tributes.length ? Math.max(...tributes.map((t) => t.createdAt)) : 0) + 60_000
  const pid = (id: string) => persons.find((p) => p.id === id)

  const guest = useStore((s) => s.guest)
  const hasParents = (graph.parents.get(me.id) ?? []).length > 0
  const profile = completeness(me, (graph.parents.get(me.id) ?? []).length)
  // cases vides : membres à qui il manque un parent (on pourra inviter / compléter)
  const gaps = useMemo(
    () =>
      persons
        .filter((p) => (graph.parents.get(p.id) ?? []).length < 2 && !p.isPivot)
        .map((p) => ({ p, missing: 2 - (graph.parents.get(p.id) ?? []).length }))
        .slice(0, 4),
    [persons, graph],
  )
  const inviteHref = whatsappLink(inviteMessage(me.lastName, me.firstName))

  return (
    <div className="mx-auto max-w-xl">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-brand text-white">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <Avatar person={me} size={52} />
            <div>
              <div className="text-sm opacity-80">Bienvenue,</div>
              <div className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>{me.firstName} {me.lastName}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm opacity-90">
            <TreePine size={16} className="text-gold" /> Famille <b>{me.lastName}</b>{stats.clan ? ` · clan ${stats.clan}` : ''}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Stat n={stats.total} l="membres" />
            <Stat n={stats.vivants} l="vivants" />
            <Stat n={stats.memoire} l="en mémoire" />
            <Stat n={stats.gens} l="générations" />
          </div>
        </div>
        <div className="motif" />
      </div>

      {/* Accès rapides */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Quick to="/arbre" icon={<Network size={22} />} label="L'arbre" />
        <Quick to="/lien" icon={<GitCompareArrows size={22} />} label="Notre lien" />
        <Quick to="/membres" icon={<Users size={22} />} label="Membres" />
      </div>

      {/* Onboarding : déclarer sa lignée */}
      {!hasParents && (
        <Link to="/onboarding" className="mt-4 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold-soft/60 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold text-white"><UserPlus size={22} /></span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-ink">Déclare ta lignée</div>
            <div className="text-xs text-muted">Ajoute tes parents et grands-parents — RACINES trouvera ensuite tes proches.</div>
          </div>
          <ArrowRight size={18} className="text-gold" />
        </Link>
      )}

      {/* Complétude du profil */}
      {!guest && profile.pct < 100 && (
        <Link to="/profil/editer" className="mt-4 block rounded-2xl border border-line bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Ton profil est rempli à {profile.pct}%</span>
            <span className="text-sage">Compléter →</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${profile.pct}%` }} />
          </div>
          {profile.missing.length > 0 && <p className="mt-2 text-xs text-faint">Il manque : {profile.missing.slice(0, 3).join(', ')}…</p>}
        </Link>
      )}

      {/* Invitation WhatsApp */}
      <a href={inviteHref} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-2xl bg-sage p-4 text-white">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Share2 size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Inviter la famille sur WhatsApp</div>
          <div className="text-xs opacity-90">Chaque proche invité fait grandir l'arbre.</div>
        </div>
        <ArrowRight size={18} />
      </a>

      {/* Cases vides à compléter */}
      {gaps.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-primary"><UserPlus size={16} className="text-gold" /> À compléter</h2>
          <div className="space-y-2">
            {gaps.map(({ p }) => (
              <Link key={p.id} to={`/ajouter?relativeOf=${p.id}`} className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-card p-3">
                <Avatar person={p} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{p.firstName} {p.lastName}</div>
                  <div className="text-xs text-faint">Ajoute son père / sa mère</div>
                </div>
                <ArrowRight size={16} className="text-gold" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Suggestions de match */}
      {suggestions.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-primary">
            <Sparkles size={16} className="text-gold" /> Rapprochements suggérés
          </h2>
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((m) => (
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

      {/* Hommages récents */}
      {recent.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-primary">
            <Quote size={16} className="text-terre" /> Souvenirs récents
          </h2>
          <div className="space-y-2">
            {recent.map((t) => {
              const p = pid(t.personId)
              return (
                <Link key={t.id} to={`/membre/${t.personId}`} className="block rounded-xl border border-terre/20 bg-terre-soft/40 p-3">
                  <div className="flex items-center gap-2 text-xs text-terre">
                    <Avatar person={p} size={24} /> En mémoire de <b>{p?.firstName} {p?.lastName}</b>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm italic text-ink">« {t.text} »</p>
                  <p className="mt-1 text-xs text-faint">— {t.authorName} · {timeAgo(t.createdAt, now)}</p>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-xl bg-white/10 py-2">
      <div className="text-xl font-extrabold text-gold">{n}</div>
      <div className="text-[10px] opacity-80">{l}</div>
    </div>
  )
}

function Quick({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-card py-4 text-primary transition hover:border-sage hover:shadow-sm">
      {icon}
      <span className="text-xs font-medium text-ink">{label}</span>
    </Link>
  )
}
