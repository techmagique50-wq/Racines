import { useMemo, useState } from 'react'
import { CalendarHeart, MapPin, Plus, Users, X, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { EVENT_KIND, type EventKind, type FamilyEvent } from '../family/types'
import { Avatar, PageTitle, useGate } from '../ui/ui'

export function EventsPage() {
  const events = useStore((s) => s.events)
  const { gate } = useGate()
  const [open, setOpen] = useState(false)
  const sorted = useMemo(() => [...events].sort((a, b) => a.date.localeCompare(b.date)), [events])

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-start justify-between">
        <PageTitle title="Événements" subtitle="Mariages, deuils, naissances, retrouvailles…" />
        <button onClick={() => gate(() => setOpen(true))} className="flex items-center gap-1.5 rounded-xl bg-gold px-3 py-2 text-sm font-semibold text-white"><Plus size={16} /> Créer</button>
      </div>

      <div className="space-y-4">
        {sorted.map((e) => <EventCard key={e.id} event={e} />)}
        {!sorted.length && <p className="py-8 text-center text-sm text-faint">Aucun événement. Crée le premier 🎉</p>}
      </div>

      {open && <CreateModal onClose={() => setOpen(false)} />}
    </div>
  )
}

function EventCard({ event }: { event: FamilyEvent }) {
  const meId = useStore((s) => s.meId)
  const persons = useStore((s) => s.persons)
  const rsvp = useStore((s) => s.toggleRsvp)
  const deleteEvent = useStore((s) => s.deleteEvent)
  const isGardien = persons.find((p) => p.id === meId)?.role === 'gardien'
  const { gate } = useGate()
  const k = EVENT_KIND[event.kind]
  const going = event.participants.includes(meId)
  const date = new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-soft text-2xl">{k.emoji}</div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gold">{k.label}</span>
          <h2 className="font-bold text-ink">{event.title}</h2>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted">
            <span className="flex items-center gap-1.5"><CalendarHeart size={15} /> {date}</span>
            {event.place && <span className="flex items-center gap-1.5"><MapPin size={15} /> {event.place}</span>}
          </div>
        </div>
        {isGardien && (
          <button
            onClick={() => { if (confirm(`Supprimer l’événement « ${event.title} » ? (action de modération, tracée)`)) deleteEvent(event.id) }}
            title="Modérer : supprimer"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-terre/10 hover:text-terre"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {event.description && <p className="mt-3 text-sm text-muted">{event.description}</p>}
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Users size={16} />
          <div className="flex -space-x-2">
            {event.participants.slice(0, 5).map((pid) => (
              <span key={pid} className="rounded-full ring-2 ring-card"><Avatar person={persons.find((p) => p.id === pid)} size={26} /></span>
            ))}
          </div>
          <span>{event.participants.length}</span>
        </div>
        <button onClick={() => gate(() => rsvp(event.id))} className={`rounded-xl px-4 py-1.5 text-sm font-semibold ${going ? 'bg-sage-soft text-sage' : 'bg-sage text-white'}`}>
          {going ? 'Je participe ✓' : 'Participer'}
        </button>
      </div>
    </article>
  )
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const createEvent = useStore((s) => s.createEvent)
  const [kind, setKind] = useState<EventKind>('retrouvailles')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [place, setPlace] = useState('')
  const [description, setDescription] = useState('')

  const submit = () => {
    if (!title.trim() || !date) return
    createEvent({ kind, title: title.trim(), date, place: place.trim() || undefined, description: description.trim() || undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md animate-fade-up overflow-y-auto rounded-3xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Nouvel événement</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-bg"><X size={20} /></button>
        </div>
        <label className="mb-1 block text-xs font-medium text-muted">Type</label>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {(Object.keys(EVENT_KIND) as EventKind[]).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-xl border px-2 py-2 text-xs font-medium ${kind === k ? 'border-gold bg-gold-soft text-gold' : 'border-line text-muted'}`}>
              {EVENT_KIND[k].emoji} {EVENT_KIND[k].label}
            </button>
          ))}
        </div>
        <Field label="Titre *" value={title} onChange={setTitle} />
        <Field label="Date *" value={date} onChange={setDate} type="date" />
        <Field label="Lieu" value={place} onChange={setPlace} />
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-line px-3 py-2 text-sm" />
        </label>
        <button onClick={submit} disabled={!title.trim() || !date} className="w-full rounded-xl bg-gold py-3 font-semibold text-white disabled:opacity-40">Créer l'événement</button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:border-sage focus:outline-none" />
    </label>
  )
}
