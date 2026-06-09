import { useEffect } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Network, GitCompareArrows, Users, UserPlus, TreePine, Moon, Sun,
  Newspaper, MessageCircle, CalendarHeart, LogOut, UserCheck, Globe2, Loader2,
} from 'lucide-react'
import { useAccount, useMe, useStore } from './store'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { Avatar } from './ui/ui'
import { Feedback } from './components/Feedback'

const nav = [
  { to: '/', label: 'Accueil', icon: Home, end: true, bottom: true },
  { to: '/fil', label: 'Fil', icon: Newspaper, end: false, bottom: true },
  { to: '/arbre', label: 'Arbre', icon: Network, end: false, bottom: true },
  { to: '/lien', label: 'Lien', icon: GitCompareArrows, end: false, bottom: false },
  { to: '/membres', label: 'Membres', icon: Users, end: false, bottom: false },
  { to: '/diaspora', label: 'Diaspora', icon: Globe2, end: false, bottom: false },
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
  const bootstrap = useStore((s) => s.bootstrap)
  const hydrate = useStore((s) => s.hydrate)
  const hydrated = useStore((s) => s.hydrated)
  const meId = useStore((s) => s.meId)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Démarrage : vérifie la session Supabase (mode réel) ou active le mode démo.
  useEffect(() => { bootstrap() }, [bootstrap])

  // Mode démo seulement : pas de compte → exploration visiteur directe.
  useEffect(() => {
    if (!isSupabaseConfigured && !account && !guest) enterGuest()
  }, [account, guest, enterGuest])

  // Mode réel : re-hydrate à chaque changement de session (connexion/déconnexion).
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const { data } = supabase.auth.onAuthStateChange(() => { hydrate() })
    return () => data.subscription.unsubscribe()
  }, [hydrate])

  const ThemeBtn = ({ className = '' }: { className?: string }) => (
    <button onClick={toggleTheme} aria-label="Changer de thème" className={`grid h-9 w-9 place-items-center rounded-full transition active:scale-90 ${className}`}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )

  // Mode réel (Supabase)
  if (isSupabaseConfigured) {
    if (!hydrated) return <div className="grid h-full place-items-center text-faint"><Loader2 className="animate-spin" /></div>
    if (!meId) return <Navigate to="/login" replace />
    return <Shell me={<MeBlock />} themeBtn={ThemeBtn} loc={loc} isGuest={false} onLogout={() => { logout(); navigate('/login') }} />
  }

  // Mode démo (local)
  if (!account && !guest) return null
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
  // Coque unique « façon mobile » : colonne centrée à toutes les tailles.
  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col bg-card shadow-xl shadow-black/5">
      {/* En-tête */}
      <header className="sticky top-0 z-20 bg-brand text-white print:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="flex items-center gap-2 text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
            <TreePine size={20} className="text-gold" /> RACINES
          </span>
          <div className="flex items-center gap-2">
            <ThemeBtn className="text-white hover:bg-white/15" />
            {isGuest ? (
              <NavLink to="/signup" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gold px-3 py-1.5 text-sm font-semibold text-white">
                <UserPlus size={15} /> Créer un compte
              </NavLink>
            ) : (
              <>
                {me}
                <button onClick={onLogout} title="Déconnexion" aria-label="Déconnexion" className="grid h-9 w-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 active:scale-90">
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="motif" />
      </header>

      {/* Contenu */}
      <main className="flex-1 animate-fade-up p-4 pb-24" key={loc.pathname}>
        {isGuest && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gold/40 bg-gold-soft/60 p-3 print:hidden">
            <span className="text-sm text-muted">👀 Tu explores la famille <b className="text-ink">démo (Mballa)</b>. Crée ton compte pour bâtir <b className="text-ink">ta</b> famille.</span>
            <NavLink to="/signup" className="rounded-xl bg-gold px-3 py-1.5 text-sm font-semibold text-white">Créer mon compte</NavLink>
          </div>
        )}
        <Outlet />
      </main>

      {/* Barre du bas (centrée sur la colonne) */}
      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 items-stretch justify-around border-t border-line bg-card/95 backdrop-blur print:hidden">
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

      {/* Bouton flottant « Ajouter » (centré sur la colonne) */}
      {loc.pathname !== '/ajouter' && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4 print:hidden">
          <NavLink to="/ajouter" className="pointer-events-auto ml-auto flex h-14 w-fit items-center gap-2 rounded-full bg-gold px-5 font-bold text-white shadow-lg shadow-gold/30 transition active:scale-95">
            <UserPlus size={22} /> Ajouter
          </NavLink>
        </div>
      )}

      <div className="print:hidden"><Feedback /></div>
    </div>
  )
}
