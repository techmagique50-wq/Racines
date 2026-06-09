// ── Moteur de parenté RACINES ────────────────────────────────────────────────
// À partir de DEUX liens (filiation + union), déduit toute la parenté élargie
// africaine (côté maternel/paternel, demi-fratries, co-épouses) + un matching
// à 4 niveaux avec score de confiance.

import type { Filiation, Gender, Person, Union } from './types'

export interface FamilyGraph {
  persons: Map<string, Person>
  parents: Map<string, string[]>
  children: Map<string, string[]>
  spouses: Map<string, string[]>
}

export function buildGraph(persons: Person[], filiations: Filiation[], unions: Union[]): FamilyGraph {
  const g: FamilyGraph = {
    persons: new Map(persons.map((p) => [p.id, p])),
    parents: new Map(),
    children: new Map(),
    spouses: new Map(),
  }
  const push = (m: Map<string, string[]>, k: string, v: string) => {
    const arr = m.get(k)
    if (arr) {
      if (!arr.includes(v)) arr.push(v)
    } else m.set(k, [v])
  }
  for (const f of filiations) {
    push(g.parents, f.childId, f.parentId)
    push(g.children, f.parentId, f.childId)
  }
  for (const u of unions) {
    push(g.spouses, u.aId, u.bId)
    push(g.spouses, u.bId, u.aId)
  }
  return g
}

export const parentsOf = (g: FamilyGraph, id: string) =>
  (g.parents.get(id) ?? []).map((i) => g.persons.get(i)!).filter(Boolean)
export const childrenOf = (g: FamilyGraph, id: string) =>
  (g.children.get(id) ?? []).map((i) => g.persons.get(i)!).filter(Boolean)
export const spousesOf = (g: FamilyGraph, id: string) =>
  (g.spouses.get(id) ?? []).map((i) => g.persons.get(i)!).filter(Boolean)

export interface Sibling {
  person: Person
  type: 'full' | 'half'
}

export function siblingsOf(g: FamilyGraph, id: string): Sibling[] {
  const myParents = g.parents.get(id) ?? []
  const result = new Map<string, number>()
  for (const p of myParents)
    for (const c of g.children.get(p) ?? []) {
      if (c === id) continue
      result.set(c, (result.get(c) ?? 0) + 1)
    }
  return [...result.entries()].map(([sid, shared]) => ({
    person: g.persons.get(sid)!,
    type: shared >= 2 ? 'full' : 'half',
  }))
}

/** Co-épouses / co-époux : personnes partageant un même conjoint. */
export function coSpousesOf(g: FamilyGraph, id: string): Person[] {
  const out = new Set<string>()
  for (const sp of g.spouses.get(id) ?? [])
    for (const other of g.spouses.get(sp) ?? []) if (other !== id) out.add(other)
  return [...out].map((i) => g.persons.get(i)!).filter(Boolean)
}

// ── Ancêtres avec distance ───────────────────────────────────────────────────
function ancestors(g: FamilyGraph, id: string): Map<string, number> {
  const map = new Map<string, number>([[id, 0]])
  const q = [id]
  while (q.length) {
    const cur = q.shift()!
    const d = map.get(cur)!
    for (const p of g.parents.get(cur) ?? [])
      if (!map.has(p)) {
        map.set(p, d + 1)
        q.push(p)
      }
  }
  return map
}

// ── Libellés ─────────────────────────────────────────────────────────────────
const arr = (n: number) => 'arrière-'.repeat(Math.max(0, n))
function directAncestorLabel(gn: Gender, d: number) {
  if (d === 1) return gn === 'M' ? 'père' : 'mère'
  return arr(d - 2) + (gn === 'M' ? 'grand-père' : 'grand-mère')
}
function directDescendantLabel(gn: Gender, d: number) {
  if (d === 1) return gn === 'M' ? 'fils' : 'fille'
  return arr(d - 2) + (gn === 'M' ? 'petit-fils' : 'petite-fille')
}
function niblingLabel(gn: Gender, great: number) {
  if (great === 0) return gn === 'M' ? 'neveu' : 'nièce'
  return arr(great - 1) + (gn === 'M' ? 'petit-neveu' : 'petite-nièce')
}
function sideAdj(side: Side, gn: Gender): string {
  if (!side) return ''
  if (side === 'paternel') return gn === 'M' ? 'paternel' : 'paternelle'
  return gn === 'M' ? 'maternel' : 'maternelle'
}

export type Side = 'paternel' | 'maternel' | null

export interface Relationship {
  label: string
  explanation: string
  side: Side
  commonAncestorId?: string
  path: string[]
  byAlliance: boolean
}

const fullName = (p: Person) => `${p.firstName} ${p.lastName}`.trim()

export function describeRelationship(g: FamilyGraph, meId: string, otherId: string): Relationship {
  const me = g.persons.get(meId)
  const other = g.persons.get(otherId)
  const base = { side: null as Side, path: [] as string[], byAlliance: false }
  if (!me || !other) return { label: 'Inconnu', explanation: 'Personne introuvable.', ...base }
  if (meId === otherId) return { label: "c'est toi", explanation: 'Même personne.', ...base, path: [meId] }

  // conjoint
  if ((g.spouses.get(meId) ?? []).includes(otherId))
    return {
      label: other.gender === 'M' ? 'époux' : 'épouse',
      explanation: `${fullName(other)} est ton/ta conjoint·e.`,
      side: null,
      path: [meId, otherId],
      byAlliance: true,
    }

  // lien de sang
  const ancMe = ancestors(g, meId)
  const ancOther = ancestors(g, otherId)
  let bestId = '',
    dA = 0,
    dB = 0,
    bestSum = Infinity
  for (const [aid, da] of ancMe) {
    const db = ancOther.get(aid)
    if (db === undefined) continue
    const sum = da + db
    if (sum < bestSum || (sum === bestSum && Math.max(da, db) < Math.max(dA, dB))) {
      bestSum = sum
      bestId = aid
      dA = da
      dB = db
    }
  }

  if (bestId) {
    const common = g.persons.get(bestId)!
    const path = buildBloodPath(g, meId, otherId, bestId)
    // côté maternel/paternel : déterminé par le parent de "moi" sur le chemin
    const myParent = path[1] ? g.persons.get(path[1]) : undefined
    const side: Side = dA >= 1 && myParent ? (myParent.gender === 'M' ? 'paternel' : 'maternel') : null
    const expl = (l: string) => `${fullName(other)} est ton/ta ${l}.`

    if (dB === 0) {
      const l = directAncestorLabel(other.gender, dA)
      return { label: l, explanation: expl(l), side: null, commonAncestorId: bestId, path, byAlliance: false }
    }
    if (dA === 0) {
      const l = directDescendantLabel(other.gender, dB)
      return { label: l, explanation: expl(l), side: null, commonAncestorId: bestId, path, byAlliance: false }
    }
    if (dA === 1 && dB === 1) {
      const shared = (g.parents.get(meId) ?? []).filter((p) => (g.parents.get(otherId) ?? []).includes(p)).length
      const half = shared < 2
      const l = half
        ? other.gender === 'M' ? 'demi-frère' : 'demi-sœur'
        : other.gender === 'M' ? 'frère' : 'sœur'
      return {
        label: l,
        explanation: half ? `Vous partagez un seul parent : ${fullName(common)}.` : `Mêmes parents (${fullName(common)} est l'un d'eux).`,
        side,
        commonAncestorId: bestId,
        path,
        byAlliance: false,
      }
    }
    if (Math.min(dA, dB) === 1) {
      if (dB === 1) {
        // other = (grand-)oncle/tante de moi
        const great = dA - 2
        let l: string
        if (great === 0) {
          const baseL = other.gender === 'M' ? 'oncle' : 'tante'
          l = `${baseL} ${sideAdj(side, other.gender)}`.trim()
        } else l = arr(great - 1) + (other.gender === 'M' ? 'grand-oncle' : 'grand-tante')
        return {
          label: l,
          explanation: `Ancêtre commun : ${fullName(common)}. ${fullName(other)} appartient à la génération de tes (grands-)parents${side ? `, côté ${side}` : ''}.`,
          side,
          commonAncestorId: bestId,
          path,
          byAlliance: false,
        }
      }
      const l = niblingLabel(other.gender, dB - 2)
      return {
        label: l,
        explanation: `Ancêtre commun : ${fullName(common)}. ${fullName(other)} en est un descendant plus éloigné que toi.`,
        side,
        commonAncestorId: bestId,
        path,
        byAlliance: false,
      }
    }
    // cousins
    const degree = Math.min(dA, dB) - 1
    const removed = Math.abs(dA - dB)
    const c = other.gender === 'M' ? 'cousin' : 'cousine'
    let l = degree === 1 ? `${c} ${other.gender === 'M' ? 'germain' : 'germaine'}` : `${c} au ${degree}ᵉ degré`
    if (removed > 0) l += `, éloigné${other.gender === 'F' ? 'e' : ''} de ${removed} génération${removed > 1 ? 's' : ''}`
    if (side) l += ` (côté ${side})`
    return {
      label: l,
      explanation: `Votre ancêtre commun le plus proche est ${fullName(common)} : ${directAncestorLabel(common.gender, dA)} pour toi, ${directAncestorLabel(common.gender, dB)} pour ${fullName(other)}.`,
      side,
      commonAncestorId: bestId,
      path,
      byAlliance: false,
    }
  }

  // alliance
  const mySpouses = g.spouses.get(meId) ?? []
  const myChildren = g.children.get(meId) ?? []
  // co-épouse / co-époux
  if (coSpousesOf(g, meId).some((p) => p.id === otherId))
    return {
      label: other.gender === 'M' ? 'co-époux' : 'co-épouse',
      explanation: `${fullName(other)} partage un·e conjoint·e avec toi.`,
      side: null,
      path: [meId, otherId],
      byAlliance: true,
    }
  for (const s of mySpouses)
    if ((g.parents.get(s) ?? []).includes(otherId))
      return { label: other.gender === 'M' ? 'beau-père' : 'belle-mère', explanation: `Parent de ton/ta conjoint·e.`, side: null, path: [meId, s, otherId], byAlliance: true }
  for (const c of myChildren)
    if ((g.spouses.get(c) ?? []).includes(otherId))
      return { label: other.gender === 'M' ? 'gendre' : 'belle-fille', explanation: `Conjoint·e de ton enfant.`, side: null, path: [meId, c, otherId], byAlliance: true }
  const mySibs = siblingsOf(g, meId).map((s) => s.person.id)
  for (const sib of mySibs)
    if ((g.spouses.get(sib) ?? []).includes(otherId))
      return { label: other.gender === 'M' ? 'beau-frère' : 'belle-sœur', explanation: `Conjoint·e de ton frère/ta sœur.`, side: null, path: [meId, sib, otherId], byAlliance: true }
  for (const s of mySpouses)
    if (siblingsOf(g, s).some((x) => x.person.id === otherId))
      return { label: other.gender === 'M' ? 'beau-frère' : 'belle-sœur', explanation: `Frère/sœur de ton/ta conjoint·e.`, side: null, path: [meId, s, otherId], byAlliance: true }

  return {
    label: 'lien non établi',
    explanation: "Aucun lien calculé. Ajoute les parents manquants pour relier les branches.",
    side: null,
    path: [],
    byAlliance: false,
  }
}

function buildBloodPath(g: FamilyGraph, meId: string, otherId: string, commonId: string): string[] {
  const up = climb(g, meId, commonId)
  const down = climb(g, otherId, commonId)
  if (!up || !down) return [meId, otherId]
  down.reverse()
  return [...up.slice(0, -1), ...down]
}
function climb(g: FamilyGraph, from: string, target: string): string[] | null {
  const prev = new Map<string, string | null>([[from, null]])
  const q = [from]
  while (q.length) {
    const cur = q.shift()!
    if (cur === target) {
      const chain: string[] = []
      let c: string | null = cur
      while (c !== null) {
        chain.push(c)
        c = prev.get(c) ?? null
      }
      return chain.reverse()
    }
    for (const p of g.parents.get(cur) ?? [])
      if (!prev.has(p)) {
        prev.set(p, cur)
        q.push(p)
      }
  }
  return null
}

// ── Niveaux de génération (visualisation) ────────────────────────────────────
export function generationLevels(g: FamilyGraph): Map<string, number> {
  const level = new Map<string, number>()
  const roots = [...g.persons.keys()].filter((id) => (g.parents.get(id) ?? []).length === 0)
  const q: string[] = []
  for (const r of roots) {
    level.set(r, 0)
    q.push(r)
  }
  while (q.length) {
    const cur = q.shift()!
    const lvl = level.get(cur)!
    for (const c of g.children.get(cur) ?? [])
      if (!level.has(c) || lvl + 1 > (level.get(c) ?? 0)) {
        level.set(c, lvl + 1)
        q.push(c)
      }
  }
  for (const [id, sp] of g.spouses)
    for (const s of sp) {
      const a = level.get(id)
      const b = level.get(s)
      if (a != null && b != null) {
        const m = Math.max(a, b)
        level.set(id, m)
        level.set(s, m)
      } else if (a != null) level.set(s, a)
      else if (b != null) level.set(id, b)
    }
  for (const id of g.persons.keys()) if (!level.has(id)) level.set(id, 0)
  return level
}

// ── Périmètre d'une famille (lignée bornée par les alliances) ────────────────
// Une famille = la descendance d'un ancêtre-pivot + les conjoints entrés par
// alliance, traités comme des NŒUDS-FRONTIÈRE : on les affiche mais on ne
// traverse jamais leur propre lignée (la « belle-famille » reste hors périmètre).
// → règle le problème des « cousins de mon cousin » qui ne sont pas ma famille.

export interface FamilyScope {
  /** Membres du sang : descendants de la lignée. */
  blood: Set<string>
  /** Conjoints entrés par alliance (nœuds-frontière, non étendus). */
  boundary: Set<string>
}

/** Remonte la lignée patrilinéaire (père → grand-père → …) jusqu'au fondateur. */
function patrilinealRoot(g: FamilyGraph, startId: string): string {
  const seen = new Set<string>()
  let cur = startId
  while (!seen.has(cur)) {
    seen.add(cur)
    const father = (g.parents.get(cur) ?? []).map((id) => g.persons.get(id)).find((p) => p?.gender === 'M')
    if (!father) return cur
    cur = father.id
  }
  return cur
}

/**
 * Calcule le périmètre de la famille.
 * - S'il existe des ancêtres-pivots (`isPivot`), ils servent de fondateurs.
 * - Sinon on ancre sur la racine patrilinéaire de `anchorId` (sa lignée).
 * - Sinon (pas d'ancre) sur les ancêtres « racines » (sans parents connus).
 */
export function familyScope(g: FamilyGraph, anchorId?: string): FamilyScope {
  const pivots = [...g.persons.values()].filter((p) => p.isPivot).map((p) => p.id)
  let founders: string[]
  if (pivots.length) founders = pivots
  else if (anchorId && g.persons.has(anchorId)) founders = [patrilinealRoot(g, anchorId)]
  else founders = [...g.persons.keys()].filter((id) => (g.parents.get(id) ?? []).length === 0)

  const blood = new Set<string>(founders)
  const boundary = new Set<string>()
  const queue = [...founders]
  while (queue.length) {
    const p = queue.shift()!
    // Conjoints → frontière (affichés, jamais étendus).
    for (const s of g.spouses.get(p) ?? []) if (!blood.has(s)) boundary.add(s)
    // Enfants → sang (étendus). Un descendant prime sur « frontière ».
    for (const c of g.children.get(p) ?? [])
      if (!blood.has(c)) {
        blood.add(c)
        boundary.delete(c)
        queue.push(c)
      }
  }
  return { blood, boundary }
}

export const inFamily = (s: FamilyScope, id: string) => s.blood.has(id) || s.boundary.has(id)
export const isBoundary = (s: FamilyScope, id: string) => s.boundary.has(id) && !s.blood.has(id)

// ── Matching à 4 niveaux (identité · clan/lignage · ancêtres-pivots · humain) ─
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export interface MatchResult {
  person: Person
  score: number // 0–100 (confiance)
  reasons: string[]
}

/** Score de rapprochement entre deux personnes (suggestion de match/fusion). */
export function matchScore(g: FamilyGraph, a: Person, b: Person): MatchResult {
  let score = 0
  const reasons: string[] = []

  // Niveau 1 — identité (nom)
  if (norm(a.lastName) === norm(b.lastName) && a.lastName) {
    score += 22
    reasons.push('même nom de famille')
  }
  if (norm(a.firstName) === norm(b.firstName) && a.firstName) {
    score += 18
    reasons.push('même prénom')
  }

  // Niveau 2 — clan / lignage
  if (a.clan && b.clan && norm(a.clan) === norm(b.clan)) {
    score += 20
    reasons.push(`même clan (${a.clan})`)
  }
  if (a.lignage && b.lignage && norm(a.lignage) === norm(b.lignage)) {
    score += 12
    reasons.push(`même lignage (${a.lignage})`)
  }

  // Niveau 3 — ancêtres-pivots partagés
  const ancA = [...ancestors(g, a.id).keys()]
  const ancB = new Set(ancestors(g, b.id).keys())
  const sharedPivot = ancA.find((id) => ancB.has(id) && g.persons.get(id)?.isPivot)
  if (sharedPivot) {
    score += 25
    reasons.push(`ancêtre-pivot commun : ${fullName(g.persons.get(sharedPivot)!)}`)
  }

  // bonus contextuels
  if (a.village && b.village && norm(a.village) === norm(b.village)) {
    score += 8
    reasons.push(`même village (${a.village})`)
  }
  if (a.birthYear && b.birthYear && Math.abs(a.birthYear - b.birthYear) <= 3) {
    score += 5
    reasons.push('génération proche')
  }

  return { person: b, score: Math.min(100, score), reasons }
}

/** Suggestions de rattachement pour une personne (hors parents directs déjà liés). */
export function suggestMatches(g: FamilyGraph, personId: string, min = 35): MatchResult[] {
  const me = g.persons.get(personId)
  if (!me) return []
  const known = new Set<string>([
    personId,
    ...(g.parents.get(personId) ?? []),
    ...(g.children.get(personId) ?? []),
    ...(g.spouses.get(personId) ?? []),
  ])
  return [...g.persons.values()]
    .filter((p) => !known.has(p.id))
    .map((p) => matchScore(g, me, p))
    .filter((m) => m.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}

export interface DuplicatePair {
  a: Person
  b: Person
  score: number
  reasons: string[]
}

/**
 * Paires de fiches qui désignent probablement la même personne (même ancêtre
 * saisi par deux branches) → candidates à la fusion.
 */
export function duplicatePairs(g: FamilyGraph, minScore = 55): DuplicatePair[] {
  const ps = [...g.persons.values()]
  const linked = (x: string, y: string) =>
    (g.parents.get(x) ?? []).includes(y) ||
    (g.children.get(x) ?? []).includes(y) ||
    (g.spouses.get(x) ?? []).includes(y)
  const out: DuplicatePair[] = []
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i]
      const b = ps[j]
      if (linked(a.id, b.id)) continue
      const m = matchScore(g, a, b)
      const sameName =
        m.reasons.some((r) => r.includes('nom de famille')) && m.reasons.some((r) => r.includes('prénom'))
      if (sameName && m.score >= minScore) out.push({ a, b, score: m.score, reasons: m.reasons })
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, 20)
}
