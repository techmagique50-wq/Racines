import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Send, Users, X } from 'lucide-react'
import { useStore } from '../store'
import type { Conversation } from '../family/types'
import { Avatar, PageTitle, timeAgo, useGate, useRelationToMe } from '../ui/ui'

export function MessagesPage() {
  const { id } = useParams()
  if (id) return <ConversationView convId={id} />
  return <ConversationList />
}

function convTitle(c: Conversation, meId: string, name: (id: string) => string) {
  if (c.type === 'group') return c.name ?? 'Groupe familial'
  const other = c.memberIds.find((m) => m !== meId)
  return other ? name(other) : 'Discussion'
}

function ConversationList() {
  const meId = useStore((s) => s.meId)
  const conversations = useStore((s) => s.conversations)
  const messages = useStore((s) => s.messages)
  const persons = useStore((s) => s.persons)
  const { gate } = useGate()
  const [groupOpen, setGroupOpen] = useState(false)
  const [pickOpen, setPickOpen] = useState(false)
  const name = (id: string) => { const p = persons.find((x) => x.id === id); return p ? `${p.firstName} ${p.lastName}` : '?' }

  const mine = useMemo(() => {
    return conversations
      .filter((c) => c.memberIds.includes(meId))
      .map((c) => {
        const last = messages.filter((m) => m.conversationId === c.id).sort((a, b) => b.createdAt - a.createdAt)[0]
        return { c, last }
      })
      .sort((a, b) => (b.last?.createdAt ?? b.c.createdAt) - (a.last?.createdAt ?? a.c.createdAt))
  }, [conversations, messages, meId])
  const now = (messages.length ? Math.max(...messages.map((m) => m.createdAt)) : 0) + 60_000

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-start justify-between">
        <PageTitle title="Messages" subtitle="Discussions privées et groupes de la famille" />
        <div className="flex gap-2">
          <button onClick={() => gate(() => setPickOpen(true))} className="rounded-xl bg-bg p-2 text-primary ring-1 ring-line" title="Nouvelle discussion"><Plus size={18} /></button>
          <button onClick={() => gate(() => setGroupOpen(true))} className="rounded-xl bg-sage p-2 text-white" title="Nouveau groupe"><Users size={18} /></button>
        </div>
      </div>

      <div className="divide-y divide-line rounded-2xl border border-line bg-card">
        {mine.map(({ c, last }) => {
          const other = c.type === 'direct' ? persons.find((p) => p.id === c.memberIds.find((m) => m !== meId)) : undefined
          return (
            <Link key={c.id} to={`/messages/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-bg">
              {c.type === 'group' ? (
                <span className="grid h-11 w-11 place-items-center rounded-full bg-sage-soft text-sage"><Users size={20} /></span>
              ) : (
                <Avatar person={other} size={44} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium text-ink">{convTitle(c, meId, name)}</span>
                  {last && <span className="text-xs text-faint">{timeAgo(last.createdAt, now)}</span>}
                </div>
                <p className="truncate text-sm text-muted">{last ? last.text : (c.type === 'group' ? `${c.memberIds.length} membres` : 'Démarrer la discussion')}</p>
              </div>
            </Link>
          )
        })}
        {!mine.length && <p className="p-6 text-center text-sm text-faint">Aucune discussion.</p>}
      </div>

      {pickOpen && <PickMemberModal onClose={() => setPickOpen(false)} />}
      {groupOpen && <GroupModal onClose={() => setGroupOpen(false)} />}
    </div>
  )
}

function ConversationView({ convId }: { convId: string }) {
  const meId = useStore((s) => s.meId)
  const conversations = useStore((s) => s.conversations)
  const messages = useStore((s) => s.messages)
  const persons = useStore((s) => s.persons)
  const sendMessage = useStore((s) => s.sendMessage)
  const { gate } = useGate()
  const [text, setText] = useState('')
  const conv = conversations.find((c) => c.id === convId)
  const name = (id: string) => { const p = persons.find((x) => x.id === id); return p ? `${p.firstName} ${p.lastName}` : '?' }
  const otherId = conv?.type === 'direct' ? conv.memberIds.find((m) => m !== meId) : undefined
  const rel = useRelationToMe(otherId ?? meId)

  const thread = useMemo(() => messages.filter((m) => m.conversationId === convId).sort((a, b) => a.createdAt - b.createdAt), [messages, convId])
  if (!conv) return <p className="text-faint">Discussion introuvable.</p>

  const send = () => gate(() => { if (text.trim()) { sendMessage(convId, text.trim()); setText('') } })

  return (
    <div className="mx-auto flex max-w-xl flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      <div className="flex items-center gap-3 border-b border-line pb-3">
        <Link to="/messages" className="rounded-lg p-1.5 hover:bg-bg"><ArrowLeft size={20} /></Link>
        {conv.type === 'group' ? <span className="grid h-10 w-10 place-items-center rounded-full bg-sage-soft text-sage"><Users size={18} /></span> : <Avatar person={persons.find((p) => p.id === otherId)} size={40} />}
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{convTitle(conv, meId, name)}</div>
          {conv.type === 'group' ? <div className="truncate text-xs text-faint">{conv.memberIds.map(name).join(', ')}</div> : rel && rel !== 'toi' && <div className="text-xs text-sage">{rel}</div>}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {thread.map((m) => {
          const mine = m.fromId === meId
          const from = persons.find((p) => p.id === m.fromId)
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand text-white' : 'bg-bg text-ink'}`}>
                {conv.type === 'group' && !mine && <div className="mb-0.5 text-[11px] font-semibold text-sage">{from?.firstName}</div>}
                {m.text}
              </div>
            </div>
          )
        })}
        {!thread.length && <p className="py-8 text-center text-sm text-faint">Démarre la conversation 👋</p>}
      </div>

      <div className="flex items-center gap-2 border-t border-line pt-3">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Écrire un message…" className="flex-1 rounded-full bg-bg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sage" />
        <button onClick={send} className="rounded-full bg-sage p-2.5 text-white"><Send size={18} /></button>
      </div>
    </div>
  )
}

function PickMemberModal({ onClose }: { onClose: () => void }) {
  const meId = useStore((s) => s.meId)
  const persons = useStore((s) => s.persons)
  const startDirect = useStore((s) => s.startDirect)
  const navigate = useNavigate()
  const list = persons.filter((p) => p.id !== meId && p.state === 'vivant').sort((a, b) => a.firstName.localeCompare(b.firstName))
  return (
    <Modal title="Nouvelle discussion" onClose={onClose}>
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {list.map((p) => (
          <button key={p.id} onClick={() => { const id = startDirect(p.id); onClose(); navigate(`/messages/${id}`) }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-bg">
            <Avatar person={p} size={38} /><span className="text-sm font-medium text-ink">{p.firstName} {p.lastName}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

function GroupModal({ onClose }: { onClose: () => void }) {
  const meId = useStore((s) => s.meId)
  const persons = useStore((s) => s.persons)
  const createGroup = useStore((s) => s.createGroup)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const list = persons.filter((p) => p.id !== meId && p.state === 'vivant').sort((a, b) => a.firstName.localeCompare(b.firstName))
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  return (
    <Modal title="Nouveau groupe" onClose={onClose}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du groupe (ex. Cousins Mballa)" className="mb-3 w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {list.map((p) => (
          <button key={p.id} onClick={() => toggle(p.id)} className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${sel.includes(p.id) ? 'bg-sage-soft' : 'hover:bg-bg'}`}>
            <Avatar person={p} size={36} />
            <span className="flex-1 text-sm font-medium text-ink">{p.firstName} {p.lastName}</span>
            {sel.includes(p.id) && <span className="text-sage">✓</span>}
          </button>
        ))}
      </div>
      <button onClick={() => { const id = createGroup(name, sel); onClose(); navigate(`/messages/${id}`) }} disabled={sel.length === 0} className="mt-3 w-full rounded-xl bg-sage py-3 font-semibold text-white disabled:opacity-40">
        Créer le groupe ({sel.length})
      </button>
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md animate-fade-up rounded-3xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-bg"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
