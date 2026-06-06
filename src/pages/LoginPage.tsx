import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, TreePine } from 'lucide-react'
import { useStore } from '../store'

export function LoginPage() {
  const login = useStore((s) => s.login)
  const authId = useStore((s) => s.authId)
  const theme = useStore((s) => s.theme)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  useEffect(() => {
    if (authId) navigate('/', { replace: true })
  }, [authId, navigate])

  const submit = () => {
    const res = login(email, password)
    if (!res.ok) setError(res.error ?? 'Erreur')
    else navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-gold"><TreePine size={28} /></div>
          <h1 className="text-2xl font-bold text-primary" style={{ fontFamily: 'Fraunces, serif' }}>RACINES</h1>
          <p className="text-sm text-muted">la mémoire des familles</p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-3 text-lg font-bold text-ink">Connexion</h2>
          {error && <p className="mb-3 rounded-lg bg-terre-soft px-3 py-2 text-sm text-terre">{error}</p>}
          <label className="mb-1 block text-xs font-medium text-muted">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.cm" className="mb-3 w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:border-sage focus:outline-none" />
          <label className="mb-1 block text-xs font-medium text-muted">Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="••••••••" className="mb-4 w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:border-sage focus:outline-none" />
          <button onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white transition active:scale-[0.98]">
            <LogIn size={18} /> Se connecter
          </button>

          <p className="mt-4 text-center text-sm text-muted">Pas encore de compte ? <Link to="/signup" className="font-semibold text-sage">Rejoindre ma famille</Link></p>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-card p-3 text-xs text-muted">
          <b className="text-ink">Comptes de démo</b> · mot de passe <code className="rounded bg-bg px-1">demo1234</code>
          <div className="mt-1">herve@famille.cm · jean@famille.cm · marguerite@famille.cm</div>
        </div>
      </div>
    </div>
  )
}
