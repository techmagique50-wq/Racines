import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, TreePine } from 'lucide-react'
import { useStore } from '../store'
import type { Gender } from '../family/types'

export function SignupPage() {
  const signup = useStore((s) => s.signup)
  const persons = useStore((s) => s.persons)
  const accounts = useStore((s) => s.accounts)
  const theme = useStore((s) => s.theme)
  const navigate = useNavigate()

  const [mode, setMode] = useState<'claim' | 'new'>('claim')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [claimPersonId, setClaimPersonId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<Gender>('M')
  const [clan, setClan] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const claimable = useMemo(() => {
    const taken = new Set(accounts.map((a) => a.personId))
    return persons.filter((p) => p.state === 'vivant' && !taken.has(p.id)).sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [persons, accounts])

  const submit = () => {
    setError('')
    const res = signup({
      name: name || (mode === 'new' ? `${firstName} ${lastName}` : ''),
      email,
      password,
      claimPersonId: mode === 'claim' ? claimPersonId : undefined,
      newPerson: mode === 'new' ? { firstName, lastName, gender, clan: clan || undefined, city: city || undefined } : undefined,
    })
    if (!res.ok) setError(res.error ?? 'Erreur')
    else navigate('/onboarding', { replace: true })
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm py-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-gold"><TreePine size={28} /></div>
          <h1 className="text-2xl font-bold text-primary" style={{ fontFamily: 'Fraunces, serif' }}>Rejoindre ma famille</h1>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5">
          {error && <p className="mb-3 rounded-lg bg-terre-soft px-3 py-2 text-sm text-terre">{error}</p>}

          <Field label="Ton nom complet" value={name} onChange={setName} placeholder="Hervé Mballa" />
          <Field label="Email" value={email} onChange={setEmail} placeholder="ton@email.cm" />
          <Field label="Mot de passe" value={password} onChange={setPassword} type="password" placeholder="4 caractères min." />

          <div className="my-3 grid grid-cols-2 gap-2">
            <button onClick={() => setMode('claim')} className={`rounded-xl border px-2 py-2 text-sm font-medium ${mode === 'claim' ? 'border-sage bg-sage-soft text-sage' : 'border-line text-muted'}`}>Je suis dans l'arbre</button>
            <button onClick={() => setMode('new')} className={`rounded-xl border px-2 py-2 text-sm font-medium ${mode === 'new' ? 'border-sage bg-sage-soft text-sage' : 'border-line text-muted'}`}>Créer mon profil</button>
          </div>

          {mode === 'claim' ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Quel membre es-tu ?</span>
              <select value={claimPersonId} onChange={(e) => setClaimPersonId(e.target.value)} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm">
                <option value="">— choisir —</option>
                {claimable.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.city ? ` · ${p.city}` : ''}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom" value={firstName} onChange={setFirstName} />
                <Field label="Nom" value={lastName} onChange={setLastName} />
              </div>
              <div className="flex gap-2">
                {(['M', 'F'] as Gender[]).map((g) => (
                  <button key={g} onClick={() => setGender(g)} className={`flex-1 rounded-xl border px-2 py-2 text-sm ${gender === g ? 'border-sage bg-sage-soft text-sage' : 'border-line'}`}>{g === 'M' ? 'Homme' : 'Femme'}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Clan" value={clan} onChange={setClan} />
                <Field label="Ville" value={city} onChange={setCity} />
              </div>
            </div>
          )}

          <button onClick={submit} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-semibold text-white transition active:scale-[0.98]">
            <UserPlus size={18} /> Créer mon compte
          </button>
          <p className="mt-4 text-center text-sm text-muted">Déjà inscrit ? <Link to="/login" className="font-semibold text-sage">Se connecter</Link></p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:border-sage focus:outline-none" />
    </label>
  )
}
