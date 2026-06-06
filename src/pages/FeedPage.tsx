import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Send, Star } from 'lucide-react'
import { useStore } from '../store'
import type { Post } from '../family/types'
import { Avatar, PageTitle, timeAgo, useRelationToMe } from '../ui/ui'

export function FeedPage() {
  const posts = useStore((s) => s.posts)
  const addPost = useStore((s) => s.addPost)
  const [text, setText] = useState('')

  const now = useMemo(() => {
    const ts = posts.flatMap((p) => [p.createdAt, ...p.comments.map((c) => c.createdAt)])
    return (ts.length ? Math.max(...ts) : 0) + 120_000
  }, [posts])
  const sorted = useMemo(() => [...posts].sort((a, b) => b.createdAt - a.createdAt), [posts])

  const submit = () => {
    if (!text.trim()) return
    addPost(text.trim())
    setText('')
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Le fil de la famille" subtitle="Partagez nouvelles, souvenirs et photos avec toute la grande famille." />

      <div className="mb-4 rounded-2xl border border-line bg-card p-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Quoi de neuf dans la famille ?" className="w-full resize-none rounded-xl bg-bg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-sage" />
        <div className="mt-2 flex justify-end">
          <button onClick={submit} disabled={!text.trim()} className="flex items-center gap-1.5 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
            <Send size={16} /> Publier
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map((p) => <PostCard key={p.id} post={p} now={now} />)}
        {!sorted.length && <p className="py-8 text-center text-sm text-faint">Aucune publication. Sois le premier à partager 🌿</p>}
      </div>
    </div>
  )
}

function PostCard({ post, now }: { post: Post; now: number }) {
  const persons = useStore((s) => s.persons)
  const meId = useStore((s) => s.meId)
  const toggleLike = useStore((s) => s.toggleLike)
  const addComment = useStore((s) => s.addComment)
  const author = persons.find((p) => p.id === post.authorId)
  const rel = useRelationToMe(post.authorId)
  const memoryPerson = post.memoryOf ? persons.find((p) => p.id === post.memoryOf) : undefined
  const liked = post.likes.includes(meId)
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')

  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar person={author} />
        <div className="min-w-0 flex-1">
          <Link to={`/membre/${post.authorId}`} className="font-semibold text-ink hover:underline">{author?.firstName} {author?.lastName}</Link>
          <div className="flex items-center gap-2 text-xs text-faint">
            {rel && rel !== 'toi' && <span className="text-sage">{rel}</span>}
            <span>· {timeAgo(post.createdAt, now)}</span>
          </div>
        </div>
      </div>

      {memoryPerson && (
        <Link to={`/membre/${memoryPerson.id}`} className="mt-3 flex items-center gap-2 rounded-xl bg-terre-soft px-3 py-2 text-xs text-terre">
          <Star size={14} /> Souvenir de {memoryPerson.firstName} {memoryPerson.lastName}
        </Link>
      )}

      <p className="mt-3 whitespace-pre-wrap text-[15px] text-ink">{post.text}</p>

      <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-sm">
        <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1.5 ${liked ? 'text-terre' : 'text-muted'}`}>
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} /> {post.likes.length}
        </button>
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-muted">
          <MessageCircle size={18} /> {post.comments.length}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {post.comments.map((c) => {
            const ca = persons.find((p) => p.id === c.authorId)
            return (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar person={ca} size={30} />
                <div className="rounded-xl bg-bg px-3 py-2">
                  <span className="text-xs font-semibold text-ink">{ca?.firstName}</span>
                  <p className="text-sm text-muted">{c.text}</p>
                </div>
              </div>
            )
          })}
          <div className="flex items-center gap-2">
            <input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) { addComment(post.id, comment.trim()); setComment('') } }} placeholder="Commenter…" className="flex-1 rounded-full bg-bg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sage" />
            <button onClick={() => { if (comment.trim()) { addComment(post.id, comment.trim()); setComment('') } }} className="rounded-full bg-sage p-2 text-white"><Send size={16} /></button>
          </div>
        </div>
      )}
    </article>
  )
}
