import { useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Network, GitCompareArrows, Users, UserPlus, TreePine, Moon, Sun,
  Newspaper, MessageCircle, CalendarHeart, LogOut, UserCheck,
} from 'lucide-react'
import { useAccount, useMe, useStore } from './store'
import { Avatar } from './ui/ui'
import { Feedback } from './components/Feedback'

const nav = [
  { to: '/', label: 'Accueil', icon: Home, end: true, bottom: true },
  { to: '/fil', label: 'Fil', icon: Newspaper, end: false, bottom: true },
  { to: '/arbre', label: 'Arbre', icon: Network, end: false, bottom: true },
  { to: '/lien', label: 'Lien', icon: GitCompareArrows, end: false, bottom: false },
  { to: '/membres', label: 'Membres', icon: Users, end: false, bottom: false },
  { to: '/evenements', label: 'Événements', icon: CalendarHeart, end: false, bottom: false },
  { to: '/demandes', label: 'Demandes', icon: UserCheck, end: false, bottom: false },
  { to: '/messages', label: 'Messages', icon: MessageCircle, end: false, bottom: true },
]
const bottomNav = nav.filter((n) => n.bottom).concat([{ to: '/membres', label: 'Membres', icon: Users, end: false, bottom: true }])

export default function App() {
  const account = useAccount()
  const loc = useLocation()
  const navigate = useNavigate()
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const logout = useStore((s) => s.logout)
  const guest = useStore((s) => s.guest)
  const enterGuest = useStore((s) => s.enterGuest)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Entrée directe : pas de compte → on explore en visiteur, sans écran de connexion.
  useEffect(() => {
    if (!account && !guest) enterGuest()
  }, [account, guest, enterGuest])

  const ThemeBtn = ({ className = '' }: { className?: string }) => (
    <button onClick={toggleTheme} aria-label="Changer de thème" className={`grid h-9 w-9 place-items-center rounded-full transition active:scale-90 ${className}`}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )

  if (!account && !guest) return null // bref, le temps que le mode visiteur s'active
  return <Shell me={<MeBlock />} themeBtn={ThemeBtn} loc={loc} isGuest={!account} onLogout={() => { logout(); navigate('/login') }} />
}

function MeBlock() {
  const me = useMe()
  return (
    <NavLink to={`/membre/${me.id}`}>
      <Avatar person={me} size={32} />
    </NavLink>
  )
}

function Shell({
  me,
  themeBtn: ThemeBtn,
  loc,
  isGuest,
  onLogout,
}: {
  me: React.ReactNode
  themeBtn: (p: { className?: string }) => React.ReactElement
  loc: ReturnType<typeof useLocation>
  isGuest: boolean
  onLogout: () => void
}) {
  const meP = useMe()
  const persons = useStore((s) => s.persons)
  const filiations = useStore((s) => s.filiations)
  const unions = useStore((s) => s.unions)
  const pendingCount = useMemo(
    () =>
      persons.filter((p) => {
        const inP =
          filiations.some((f) => (f.childId === p.id || f.parentId === p.id) && f.status === 'pending') ||
          unions.some((u) => (u.aId === p.id || u.bId === p.id) && u.status === 'pending')
        const inC =
          filiations.some((f) => (f.childId === p.id || f.parentId === p.id) && f.status === 'confirmed') ||
          unions.some((u) => (u.aId === p.id || u.bId === p.id) && u.status === 'confirmed')
        return (inP && !inC) || p.role === 'attente'
      }).length,
    [persons, filiations, unions],
  )
  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col bg-card md:my-4 md:flex-row md:overflow-hidden md:rounded-[1.75rem] md:shadow-xl md:shadow-black/5">
      {/* Header mobile */}
      <header className="sticky top-0 z-20 bg-brand text-white md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="flex items-center gap-2 text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
            <TreePine size={20} className="text-gold" /> RACINES
          </span>
          <div className="flex items-center gap-1">
            <ThemeBtn className="text-white hover:bg-white/15" />
            {me}
          </div>
        </div>
        <div className="motif" />
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden w-60 flex-col gap-1 border-r border-line bg-card p-4 md:flex">
        <div className="mb-5 px-2">
          <div className="flex items-center gap-2 text-xl font-extrabold text-primary" style={{ fontFamily: 'Fraunces, serif' }}>
            <TreePine size={22} className="text-gold" /> RACINES
          </div>
          <div className="text-xs text-faint">la mémoire des familles</div>
        </div>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition active:scale-[0.98] ${isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-bg'}`}>
            <n.icon size={18} className="transition group-hover:scale-110" /> {n.label}
            {n.to === '/demandes' && pendingCount > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-white">{pendingCount}</span>
            )}
          </NavLink>
        ))}
        <NavLink to="/ajouter" className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-95">
          <UserPlus size={18} /> Ajouter un proche
        </NavLink>
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
            <span className="text-sm text-muted">Thème</span>
            <ThemeBtn className="text-ink hover:bg-bg" />
          </div>
          {isGuest ? (
            <NavLink to="/signup" className="flex items-center justify-center gap-2 rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-white">
              <UserPlus size={16} /> Créer mon compte
            </NavLink>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-bg p-2">
              <Avatar person={meP} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{meP.firstName} {meP.lastName}</div>
                <NavLink to={`/membre/${meP.id}`} className="text-xs text-sage">mon profil</NavLink>
              </div>
              <button onClick={onLogout} title="Déconnexion" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-line/50"><LogOut size={16} /></button>
            </div>
          )}
        </div>
      </aside>

      {/* Contenu */}
      <main className="flex-1 animate-fade-up p-4 pb-24 md:pb-6" key={loc.pathname}>
        {isGuest && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gold/40 bg-gold-soft/60 p-3">
            <span className="text-sm text-muted">👀 Tu explores la famille <b className="text-ink">démo (Mballa)</b>. Crée ton compte pour bâtir <b className="text-ink">ta</b> famille.</span>
            <NavLink to="/signup" className="rounded-xl bg-gold px-3 py-1.5 text-sm font-semibold text-white">Créer mon compte</NavLink>
          </div>
        )}
        <Outlet />
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-line bg-card/95 backdrop-blur md:hidden">
        {bottomNav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) =>
            `relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${isActive ? 'text-primary' : 'text-faint'}`}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 h-1 w-8 rounded-full bg-gold" />}
                <n.icon size={22} className={isActive ? 'scale-110 transition' : 'transition'} />
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* FAB ajouter (mobile) */}
      {loc.pathname !== '/ajouter' && (
        <NavLink to="/ajouter" className="fixed bottom-20 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-gold px-5 font-bold text-white shadow-lg shadow-gold/30 transition active:scale-95 md:hidden">
          <UserPlus size={22} /> Ajouter
        </NavLink>
      )}

      <Feedback />
    </div>
  )
}
