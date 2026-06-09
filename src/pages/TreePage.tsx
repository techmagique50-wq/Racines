import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ZoomIn, ZoomOut, Maximize, Printer, FileDown } from 'lucide-react'
import { useStore } from '../store'
import { generationLevels } from '../family/engine'
import { downloadGedcom } from '../family/gedcom'
import { PageTitle } from '../ui/ui'

const NODE_W = 138
const NODE_H = 64
const H_GAP = 30
const V_GAP = 104

interface Node {
  id: string
  x: number
  y: number
}

export function TreePage() {
  const meId = useStore((s) => s.meId)
  const persons = useStore((s) => s.persons)
  const filiations = useStore((s) => s.filiations)
  const unions = useStore((s) => s.unions)
  const graph = useStore((s) => s.graph)()
  const navigate = useNavigate()

  const layout = useMemo(() => {
    const levels = generationLevels(graph)
    const order = new Map<string, number>()
    const visited = new Set<string>()
    let cursor = 0
    const roots = persons
      .filter((p) => (graph.parents.get(p.id) ?? []).length === 0)
      .sort((a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0))
      .map((p) => p.id)
    const place = (id: string) => {
      if (visited.has(id)) return
      visited.add(id)
      order.set(id, cursor++)
      for (const sp of graph.spouses.get(id) ?? [])
        if (!visited.has(sp)) {
          visited.add(sp)
          order.set(sp, cursor++)
        }
      const kids = new Set<string>()
      for (const self of [id, ...(graph.spouses.get(id) ?? [])])
        for (const c of graph.children.get(self) ?? []) kids.add(c)
      ;[...kids]
        .sort((a, b) => (graph.persons.get(a)?.birthYear ?? 0) - (graph.persons.get(b)?.birthYear ?? 0))
        .forEach(place)
    }
    roots.forEach(place)
    persons.forEach((p) => place(p.id))

    const byLevel = new Map<number, string[]>()
    for (const p of persons) {
      const lvl = levels.get(p.id) ?? 0
      if (!byLevel.has(lvl)) byLevel.set(lvl, [])
      byLevel.get(lvl)!.push(p.id)
    }
    const maxRow = Math.max(...[...byLevel.values()].map((r) => r.length))
    const totalW = maxRow * (NODE_W + H_GAP)
    const nodes = new Map<string, Node>()
    for (const [lvl, ids] of byLevel) {
      ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
      const rowW = ids.length * (NODE_W + H_GAP)
      const offset = (totalW - rowW) / 2
      ids.forEach((id, i) => {
        nodes.set(id, { id, x: offset + i * (NODE_W + H_GAP) + NODE_W / 2, y: lvl * (NODE_H + V_GAP) + NODE_H / 2 + 20 })
      })
    }
    const height = (byLevel.size - 1) * (NODE_H + V_GAP) + NODE_H + 60
    return { nodes, width: totalW, height }
  }, [persons, graph])

  const [scale, setScale] = useState(0.7)
  const [tx, setTx] = useState(20)
  const [ty, setTy] = useState(0)
  const [printing, setPrinting] = useState(false)
  const fitScale = Math.min(1, 980 / Math.max(1, layout.width))

  // Impression : on bascule en rendu « pleine page », on imprime, puis on restaure.
  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done)
    const id = requestAnimationFrame(() => window.print())
    return () => {
      window.removeEventListener('afterprint', done)
      cancelAnimationFrame(id)
    }
  }, [printing])

  const clan = persons.find((p) => p.isPivot)?.lignage ?? persons[0]?.lastName ?? 'RACINES'
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, tx, ty }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setTx(drag.current.tx + (e.clientX - drag.current.x))
    setTy(drag.current.ty + (e.clientY - drag.current.y))
  }
  const onUp = () => (drag.current = null)
  const reset = () => {
    setScale(0.7)
    setTx(20)
    setTy(0)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2 print:hidden">
        <PageTitle title="L'arbre familial" subtitle="Calculé automatiquement. Touche une personne pour ouvrir son profil." />
        <div className="flex gap-2">
          <button onClick={() => downloadGedcom(persons, filiations, unions, clan)} className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2 text-sm font-semibold text-primary ring-1 ring-line transition hover:bg-card">
            <FileDown size={16} /> Exporter (GEDCOM)
          </button>
          <button onClick={() => setPrinting(true)} className="flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110">
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </div>

      {/* En-tête visible uniquement à l'impression */}
      <div className="mb-3 hidden border-b border-line pb-2 print:block">
        <div className="text-xl font-bold text-primary" style={{ fontFamily: 'Fraunces, serif' }}>🌳 Famille {clan}</div>
        <div className="text-xs text-muted">Arbre généalogique RACINES · imprimé le {today}</div>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border border-line bg-bg print:overflow-visible print:rounded-none print:border-0`}
        style={{ height: printing ? 'auto' : '70vh' }}
      >
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 print:hidden">
          <button onClick={() => setScale((s) => Math.min(2, s + 0.15))} className="rounded-lg bg-card p-2 shadow ring-1 ring-line"><ZoomIn size={18} /></button>
          <button onClick={() => setScale((s) => Math.max(0.3, s - 0.15))} className="rounded-lg bg-card p-2 shadow ring-1 ring-line"><ZoomOut size={18} /></button>
          <button onClick={reset} className="rounded-lg bg-card p-2 shadow ring-1 ring-line"><Maximize size={18} /></button>
        </div>
        <div className="absolute left-3 top-3 z-10 space-y-1 rounded-lg bg-card/90 px-3 py-2 text-xs shadow ring-1 ring-line print:hidden">
          <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-gold" /> ancêtre-pivot</div>
          <div className="flex items-center gap-2"><span className="text-terre">✦</span> en mémoire</div>
        </div>

        <svg
          className={printing ? 'block' : 'h-full w-full touch-none cursor-grab active:cursor-grabbing'}
          width={printing ? layout.width * fitScale + 40 : undefined}
          height={printing ? layout.height * fitScale + 40 : undefined}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        >
          <g transform={printing ? `translate(20,20) scale(${fitScale})` : `translate(${tx},${ty}) scale(${scale})`}>
            {unions.map((un) => {
              const a = layout.nodes.get(un.aId)
              const b = layout.nodes.get(un.bId)
              if (!a || !b) return null
              return <line key={un.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={un.status === 'confirmed' ? 'link-confirmed' : 'link-pending'} strokeWidth={2} />
            })}
            {persons.map((child) => {
              const cn = layout.nodes.get(child.id)
              if (!cn) return null
              const pf = filiations.filter((f) => f.childId === child.id)
              const pnodes = pf.map((f) => ({ f, n: layout.nodes.get(f.parentId) })).filter((x) => x.n) as { f: (typeof pf)[number]; n: Node }[]
              if (!pnodes.length) return null
              const midX = pnodes.reduce((s, p) => s + p.n.x, 0) / pnodes.length
              const midY = pnodes.reduce((s, p) => s + p.n.y, 0) / pnodes.length
              const pending = pnodes.some((p) => p.f.status !== 'confirmed')
              const busY = (cn.y - NODE_H / 2 + midY + NODE_H / 2) / 2
              return <path key={`fil-${child.id}`} d={`M ${cn.x} ${cn.y - NODE_H / 2} L ${cn.x} ${busY} L ${midX} ${busY} L ${midX} ${midY + NODE_H / 2}`} fill="none" className={pending ? 'link-pending' : 'link-confirmed'} strokeWidth={2} />
            })}
            {persons.map((p) => {
              const n = layout.nodes.get(p.id)
              if (!n) return null
              const isMe = p.id === meId
              const memoire = p.state === 'memoire'
              return (
                <foreignObject key={p.id} x={n.x - NODE_W / 2} y={n.y - NODE_H / 2} width={NODE_W} height={NODE_H}>
                  <button
                    onClick={() => navigate(`/membre/${p.id}`)}
                    className={`flex h-full w-full items-center gap-2 rounded-xl border px-2 text-left shadow-sm transition ${
                      isMe
                        ? 'border-primary bg-primary-soft ring-2 ring-primary/30'
                        : p.isPivot
                          ? 'border-gold bg-gold-soft'
                          : memoire
                            ? 'border-terre/30 bg-terre-soft'
                            : 'border-line bg-card hover:border-sage'
                    }`}
                  >
                    <span className="text-2xl leading-none">{p.avatar ?? '🧑🏾'}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-ink">
                        {p.firstName} {p.isPivot && '★'}{memoire && <span className="text-terre"> ✦</span>}
                      </span>
                      <span className="block truncate text-[10px] text-muted">
                        {p.lastName}
                        {p.birthYear ? ` · ${p.birthYear}${p.deathYear ? `–${p.deathYear}` : ''}` : ''}
                      </span>
                    </span>
                  </button>
                </foreignObject>
              )
            })}
          </g>
        </svg>
      </div>
      <p className="mt-3 text-xs text-faint print:hidden">Glisse pour te déplacer · molette/boutons pour zoomer · « toi » en bleu, pivot en or, défunts en terre cuite. Exporte en GEDCOM pour Gramps, Ancestry ou MyHeritage.</p>
    </div>
  )
}
