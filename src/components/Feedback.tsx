import { useState } from 'react'
import { MessageSquareHeart, Send, X, Copy, Mail, Check } from 'lucide-react'

// ⚙️ À PERSONNALISER : où recevoir les avis.
//   - OWNER_WHATSAPP : ton numéro WhatsApp au format international SANS le +
//     (ex. '237690000000'). Laisse vide pour ouvrir le sélecteur de contact.
//   - OWNER_EMAIL : ton email pour recevoir les avis par mail.
const OWNER_WHATSAPP = ''
const OWNER_EMAIL = ''

export function Feedback() {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  const message = `📝 Avis RACINES\nNote : ${rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : '(non notée)'}\n\n${text || '(sans commentaire)'}`

  const sendWhatsApp = () => window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank')
  const sendEmail = () => window.open(`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent('Avis RACINES')}&body=${encodeURIComponent(message)}`)
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* */ }
  }

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
          <div className="w-full max-w-sm animate-fade-up rounded-3xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Ton avis nous aide 🌿</h2>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-bg"><X size={20} /></button>
            </div>
            <p className="mb-3 text-sm text-muted">Qu'as-tu pensé de RACINES ? Une idée, un bug, une recommandation ?</p>

            <div className="mb-3 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className={`text-2xl transition ${n <= rating ? 'scale-110 text-gold' : 'text-line'}`}>★</button>
              ))}
            </div>

            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Ton message, tes recommandations…" className="w-full resize-none rounded-xl border border-line bg-bg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-sage" />

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={sendWhatsApp} className="flex flex-col items-center gap-1 rounded-xl bg-sage py-2.5 text-xs font-semibold text-white"><Send size={16} /> WhatsApp</button>
              <button onClick={sendEmail} className="flex flex-col items-center gap-1 rounded-xl bg-bg py-2.5 text-xs font-semibold text-primary ring-1 ring-line"><Mail size={16} /> Email</button>
              <button onClick={copy} className="flex flex-col items-center gap-1 rounded-xl bg-bg py-2.5 text-xs font-semibold text-primary ring-1 ring-line">{copied ? <Check size={16} className="text-sage" /> : <Copy size={16} />} {copied ? 'Copié' : 'Copier'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
