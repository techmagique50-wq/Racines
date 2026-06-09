import { useState } from 'react'
import { MessageSquareHeart, Send, X, Copy, Check } from 'lucide-react'

// ⚙️ Destinataire des avis : numéro WhatsApp au format international SANS le « + ».
const OWNER_WHATSAPP = '237655540812'

export function Feedback() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Q1 — besoin réel
  const [need, setNeed] = useState('')
  const [importance, setImportance] = useState(0) // 1–5
  // Q2 — friction
  const [friction, setFriction] = useState('')
  // Q3 — priorité + recommandation (NPS)
  const [priority, setPriority] = useState('')
  const [nps, setNps] = useState(-1) // 0–10
  // contexte
  const [place, setPlace] = useState('')

  const hasContent = !!(need.trim() || friction.trim() || priority.trim() || importance > 0 || nps >= 0)

  const message =
    `📝 Avis RACINES\n` +
    (place.trim() ? `📍 ${place.trim()}\n` : '') +
    `\n1) Besoin résolu${importance > 0 ? ` (importance ${importance}/5)` : ''}\n${need.trim() || '—'}\n` +
    `\n2) Blocage / friction\n${friction.trim() || '—'}\n` +
    `\n3) Pour rendre l'app indispensable${nps >= 0 ? ` (recommandation ${nps}/10)` : ''}\n${priority.trim() || '—'}`

  const sendWhatsApp = () => window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank')
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* */ }
  }
  const reset = () => { setNeed(''); setImportance(0); setFriction(''); setPriority(''); setNps(-1); setPlace('') }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-30 flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-lg shadow-black/20 transition active:scale-95 md:bottom-4"
      >
        <MessageSquareHeart size={18} /> Avis
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[88vh] w-full max-w-md animate-fade-up overflow-y-auto rounded-3xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Aidez-nous à améliorer RACINES 🌿</h2>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-bg"><X size={20} /></button>
            </div>
            <p className="mb-4 text-sm text-muted">3 questions rapides. Vos réponses partent directement sur WhatsApp.</p>

            {/* Q1 */}
            <Question n={1} label="Quel est le principal problème que RACINES vous aide à résoudre dans votre famille ?">
              <textarea value={need} onChange={(e) => setNeed(e.target.value)} rows={2} placeholder="Ex. retrouver des proches de la diaspora, garder la mémoire des anciens…" className="w-full resize-none rounded-xl border border-line bg-bg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-sage" />
              <Scale label="À quel point ce besoin comptait pour vous ?" max={5} value={importance} onChange={setImportance} from={1} />
            </Question>

            {/* Q2 */}
            <Question n={2} label="À quel moment avez-vous hésité, été bloqué ou perdu ?">
              <textarea value={friction} onChange={(e) => setFriction(e.target.value)} rows={2} placeholder="Ex. à l'inscription, en construisant l'arbre, en invitant un proche…" className="w-full resize-none rounded-xl border border-line bg-bg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-sage" />
            </Question>

            {/* Q3 */}
            <Question n={3} label="Quelle seule amélioration rendrait RACINES indispensable pour vous ?">
              <textarea value={priority} onChange={(e) => setPriority(e.target.value)} rows={2} placeholder="La fonctionnalité qui vous ferait l'utiliser chaque semaine…" className="w-full resize-none rounded-xl border border-line bg-bg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-sage" />
              <Scale label="Recommanderiez-vous RACINES à un proche ?" max={10} value={nps} onChange={setNps} from={0} />
            </Question>

            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-medium text-muted">Ville / Pays (facultatif)</span>
              <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ex. Douala · Cameroun / Montréal · Canada" className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sage" />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={sendWhatsApp} disabled={!hasContent} className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-sage py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40">
                <Send size={16} /> Envoyer sur WhatsApp
              </button>
              <button onClick={copy} disabled={!hasContent} className="flex items-center justify-center gap-1.5 rounded-xl bg-bg py-3 text-sm font-semibold text-primary ring-1 ring-line disabled:opacity-40">
                {copied ? <Check size={16} className="text-sage" /> : <Copy size={16} />} {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <button onClick={reset} className="mt-2 w-full text-center text-xs text-faint hover:text-muted">Réinitialiser</button>
          </div>
        </div>
      )}
    </>
  )
}

function Question({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-start gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">{n}</span>
        <span className="text-sm font-medium text-ink">{label}</span>
      </div>
      <div className="space-y-2 pl-7">{children}</div>
    </div>
  )
}

function Scale({ label, max, value, onChange, from }: { label: string; max: number; value: number; onChange: (n: number) => void; from: number }) {
  const items = Array.from({ length: max - from + 1 }, (_, i) => i + from)
  return (
    <div>
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <div className="flex flex-wrap gap-1">
        {items.map((n) => (
          <button
            key={n}
            onClick={() => onChange(value === n ? -1 : n)}
            className={`h-8 w-8 rounded-lg text-xs font-semibold ring-1 transition ${value === n ? 'bg-sage text-white ring-sage' : 'bg-bg text-muted ring-line hover:ring-sage'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
