// ── Couche d'accès données Supabase ──────────────────────────────────────────
// Traduit entre les lignes Postgres (snake_case) et les types de l'app
// (camelCase), et expose lecture (hydratation) + écritures (sous RLS).
// Toutes les fonctions supposent supabase configuré (mode réel).

import { supabase } from './supabase'
import type {
  AuditEntry, Conversation, EventKind, FamilyEvent, Filiation, Gender,
  Message, Person, Post, Role, Tribute, Union,
} from '../family/types'

function sb() {
  if (!supabase) throw new Error('Supabase non configuré')
  return supabase
}

const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : Date.now())

// ── Mapping lignes → types ────────────────────────────────────────────────────
function toPerson(r: Record<string, unknown>, phone?: string): Person {
  return {
    id: r.id as string,
    firstName: (r.first_name as string) ?? '',
    lastName: (r.last_name as string) ?? '',
    nickname: (r.nickname as string) ?? undefined,
    gender: r.gender as Gender,
    clan: (r.clan as string) ?? undefined,
    lignage: (r.lignage as string) ?? undefined,
    isPivot: (r.is_pivot as boolean) || undefined,
    birthYear: (r.birth_year as number) ?? undefined,
    deathYear: (r.death_year as number) ?? undefined,
    state: r.state as Person['state'],
    village: (r.village as string) ?? undefined,
    country: (r.country as string) ?? undefined,
    city: (r.city as string) ?? undefined,
    profession: (r.profession as string) ?? undefined,
    avatar: (r.avatar as string) ?? undefined,
    photo: (r.photo as string) ?? undefined,
    bio: (r.bio as string) ?? undefined,
    phone: phone ?? undefined,
    role: (r.role as Role) ?? undefined,
    guardianId: (r.guardian_id as string) ?? undefined,
  }
}

// ── Mapping types → lignes (insert/update) ────────────────────────────────────
function personRow(p: Partial<Person>, familyId: string) {
  const row: Record<string, unknown> = { family_id: familyId }
  if (p.id) row.id = p.id
  if (p.firstName !== undefined) row.first_name = p.firstName
  if (p.lastName !== undefined) row.last_name = p.lastName
  if (p.nickname !== undefined) row.nickname = p.nickname ?? null
  if (p.gender !== undefined) row.gender = p.gender
  if (p.clan !== undefined) row.clan = p.clan ?? null
  if (p.lignage !== undefined) row.lignage = p.lignage ?? null
  if (p.isPivot !== undefined) row.is_pivot = !!p.isPivot
  if (p.birthYear !== undefined) row.birth_year = p.birthYear ?? null
  if (p.deathYear !== undefined) row.death_year = p.deathYear ?? null
  if (p.state !== undefined) row.state = p.state
  if (p.village !== undefined) row.village = p.village ?? null
  if (p.country !== undefined) row.country = p.country ?? null
  if (p.city !== undefined) row.city = p.city ?? null
  if (p.profession !== undefined) row.profession = p.profession ?? null
  if (p.avatar !== undefined) row.avatar = p.avatar ?? null
  if (p.photo !== undefined) row.photo = p.photo ?? null
  if (p.bio !== undefined) row.bio = p.bio ?? null
  if (p.role !== undefined) row.role = p.role ?? null
  if (p.guardianId !== undefined) row.guardian_id = p.guardianId ?? null
  return row
}

// ── Hydratation : charge tout l'état d'une famille ────────────────────────────
export interface FamilyState {
  persons: Person[]
  filiations: Filiation[]
  unions: Union[]
  tributes: Tribute[]
  posts: Post[]
  events: FamilyEvent[]
  conversations: Conversation[]
  messages: Message[]
  audit: AuditEntry[]
}

export async function loadFamilyState(familyId: string): Promise<FamilyState> {
  const c = sb()
  const eq = (t: string) => c.from(t).select('*').eq('family_id', familyId)
  const [
    personsR, contactsR, filR, uniR, tribR, postsR, likesR, commR, evR, rsvpR, convR, convMR, msgR, auditR,
  ] = await Promise.all([
    eq('persons'), eq('person_contacts'), eq('filiations'), eq('unions'), eq('tributes'),
    eq('posts'), eq('post_likes'), eq('post_comments'), eq('events'), eq('event_rsvps'),
    eq('conversations'), eq('conversation_members'), eq('messages'), eq('audit_log'),
  ])

  const phoneByPerson = new Map<string, string>()
  for (const ct of contactsR.data ?? []) if (ct.phone) phoneByPerson.set(ct.person_id, ct.phone)

  const persons = (personsR.data ?? []).map((r) => toPerson(r, phoneByPerson.get(r.id as string)))
  const filiations: Filiation[] = (filR.data ?? []).map((r) => ({ id: r.id, childId: r.child_id, parentId: r.parent_id, status: r.status }))
  const unions: Union[] = (uniR.data ?? []).map((r) => ({ id: r.id, aId: r.a_id, bId: r.b_id, status: r.status, rank: r.rank ?? undefined }))
  const tributes: Tribute[] = (tribR.data ?? []).map((r) => ({ id: r.id, personId: r.person_id, kind: r.kind, authorName: r.author_name, text: r.text ?? undefined, createdAt: ms(r.created_at) }))

  const likesByPost = new Map<string, string[]>()
  for (const l of likesR.data ?? []) (likesByPost.get(l.post_id) ?? likesByPost.set(l.post_id, []).get(l.post_id)!).push(l.person_id)
  const commentsByPost = new Map<string, Post['comments']>()
  for (const cm of (commR.data ?? []).sort((a, b) => ms(a.created_at) - ms(b.created_at)))
    (commentsByPost.get(cm.post_id) ?? commentsByPost.set(cm.post_id, []).get(cm.post_id)!).push({ id: cm.id, authorId: cm.author_id, text: cm.text, createdAt: ms(cm.created_at) })
  const posts: Post[] = (postsR.data ?? []).map((r) => ({
    id: r.id, authorId: r.author_id, text: r.text, photo: r.photo ?? undefined, memoryOf: r.memory_of ?? undefined,
    createdAt: ms(r.created_at), likes: likesByPost.get(r.id) ?? [], comments: commentsByPost.get(r.id) ?? [],
  })).sort((a, b) => b.createdAt - a.createdAt)

  const rsvpByEvent = new Map<string, string[]>()
  for (const rs of rsvpR.data ?? []) (rsvpByEvent.get(rs.event_id) ?? rsvpByEvent.set(rs.event_id, []).get(rs.event_id)!).push(rs.person_id)
  const events: FamilyEvent[] = (evR.data ?? []).map((r) => ({
    id: r.id, kind: r.kind as EventKind, title: r.title, date: r.date, place: r.place ?? undefined,
    description: r.description ?? undefined, organizerId: r.organizer_id, participants: rsvpByEvent.get(r.id) ?? [], createdAt: ms(r.created_at),
  }))

  const membersByConv = new Map<string, string[]>()
  for (const m of convMR.data ?? []) (membersByConv.get(m.conversation_id) ?? membersByConv.set(m.conversation_id, []).get(m.conversation_id)!).push(m.person_id)
  const conversations: Conversation[] = (convR.data ?? []).map((r) => ({ id: r.id, type: r.type, name: r.name ?? undefined, memberIds: membersByConv.get(r.id) ?? [], createdAt: ms(r.created_at) }))
  const messages: Message[] = (msgR.data ?? []).map((r) => ({ id: r.id, conversationId: r.conversation_id, fromId: r.from_id, text: r.text, createdAt: ms(r.created_at) })).sort((a, b) => a.createdAt - b.createdAt)

  const audit: AuditEntry[] = (auditR.data ?? []).map((r) => ({ id: r.id, actorId: r.actor_id ?? '', action: r.action, targetId: r.target_id ?? undefined, summary: r.summary, createdAt: ms(r.created_at) })).sort((a, b) => b.createdAt - a.createdAt)

  return { persons, filiations, unions, tributes, posts, events, conversations, messages, audit }
}

// ── Écritures (best-effort ; les erreurs RLS sont remontées en console) ────────
const log = (label: string) => (e: unknown) => { if (e) console.error(`[repo] ${label}:`, (e as { message?: string })?.message ?? e) }

export function insertPerson(p: Person, familyId: string) {
  return sb().from('persons').insert(personRow(p, familyId)).then(({ error }) => { log('insertPerson')(error); return upsertPhone(p, familyId) })
}
export function updatePersonRow(id: string, patch: Partial<Person>, familyId: string) {
  const row = personRow(patch, familyId)
  delete (row as Record<string, unknown>).family_id
  delete (row as Record<string, unknown>).id
  return Promise.all([
    Object.keys(row).length ? sb().from('persons').update(row).eq('id', id).then(({ error }) => log('updatePerson')(error)) : Promise.resolve(),
    patch.phone !== undefined ? upsertPhone({ id, phone: patch.phone }, familyId) : Promise.resolve(),
  ])
}
function upsertPhone(p: Partial<Person>, familyId: string) {
  if (p.phone === undefined) return Promise.resolve()
  return sb().from('person_contacts').upsert({ person_id: p.id, family_id: familyId, phone: p.phone ?? null }).then(({ error }) => log('upsertPhone')(error))
}
export function setRoleRow(personId: string, role: Role) {
  return sb().from('persons').update({ role }).eq('id', personId).then(({ error }) => log('setRole')(error))
}

export function insertFiliation(f: Filiation, familyId: string) {
  return sb().from('filiations').insert({ id: f.id, family_id: familyId, child_id: f.childId, parent_id: f.parentId, status: f.status }).then(({ error }) => log('insertFiliation')(error))
}
export function insertUnion(u: Union, familyId: string) {
  return sb().from('unions').insert({ id: u.id, family_id: familyId, a_id: u.aId, b_id: u.bId, status: u.status, rank: u.rank ?? null }).then(({ error }) => log('insertUnion')(error))
}
export function setFiliationStatus(id: string) {
  return sb().from('filiations').update({ status: 'confirmed' }).eq('id', id).then(({ error }) => log('confirmFiliation')(error))
}
export function setUnionStatus(id: string) {
  return sb().from('unions').update({ status: 'confirmed' }).eq('id', id).then(({ error }) => log('confirmUnion')(error))
}

export async function approveMemberRows(personId: string, familyId: string, role: Role) {
  const c = sb()
  await Promise.all([
    c.from('filiations').update({ status: 'confirmed' }).eq('family_id', familyId).eq('status', 'pending').or(`child_id.eq.${personId},parent_id.eq.${personId}`).then(({ error }) => log('approve.fil')(error)),
    c.from('unions').update({ status: 'confirmed' }).eq('family_id', familyId).eq('status', 'pending').or(`a_id.eq.${personId},b_id.eq.${personId}`).then(({ error }) => log('approve.uni')(error)),
    c.from('persons').update({ role }).eq('id', personId).then(({ error }) => log('approve.role')(error)),
  ])
}
export async function refuseMemberRows(personId: string, familyId: string, removePerson: boolean) {
  const c = sb()
  await Promise.all([
    c.from('filiations').delete().eq('family_id', familyId).eq('status', 'pending').or(`child_id.eq.${personId},parent_id.eq.${personId}`).then(({ error }) => log('refuse.fil')(error)),
    c.from('unions').delete().eq('family_id', familyId).eq('status', 'pending').or(`a_id.eq.${personId},b_id.eq.${personId}`).then(({ error }) => log('refuse.uni')(error)),
  ])
  if (removePerson) await c.from('persons').delete().eq('id', personId).then(({ error }) => log('refuse.person')(error))
}

export function insertTribute(t: Tribute, familyId: string) {
  return sb().from('tributes').insert({ id: t.id, family_id: familyId, person_id: t.personId, kind: t.kind, author_name: t.authorName, text: t.text ?? null }).then(({ error }) => log('insertTribute')(error))
}

export function insertPost(p: Post, familyId: string) {
  return sb().from('posts').insert({ id: p.id, family_id: familyId, author_id: p.authorId, text: p.text, photo: p.photo ?? null, memory_of: p.memoryOf ?? null }).then(({ error }) => log('insertPost')(error))
}
export function insertComment(postId: string, comment: { id: string; authorId: string; text: string }, familyId: string) {
  return sb().from('post_comments').insert({ id: comment.id, post_id: postId, family_id: familyId, author_id: comment.authorId, text: comment.text }).then(({ error }) => log('insertComment')(error))
}
export async function toggleLikeRow(postId: string, personId: string, familyId: string, liked: boolean) {
  const c = sb()
  if (liked) await c.from('post_likes').insert({ post_id: postId, person_id: personId, family_id: familyId }).then(({ error }) => log('like')(error))
  else await c.from('post_likes').delete().eq('post_id', postId).eq('person_id', personId).then(({ error }) => log('unlike')(error))
}
export function deletePostRow(postId: string) {
  return sb().from('posts').delete().eq('id', postId).then(({ error }) => log('deletePost')(error))
}

export function insertEvent(e: FamilyEvent, familyId: string) {
  return sb().from('events').insert({ id: e.id, family_id: familyId, kind: e.kind, title: e.title, date: e.date, place: e.place ?? null, description: e.description ?? null, organizer_id: e.organizerId })
    .then(({ error }) => { log('insertEvent')(error); return insertRsvp(e.id, e.organizerId, familyId) })
}
function insertRsvp(eventId: string, personId: string, familyId: string) {
  return sb().from('event_rsvps').insert({ event_id: eventId, person_id: personId, family_id: familyId }).then(({ error }) => log('rsvp.insert')(error))
}
export async function toggleRsvpRow(eventId: string, personId: string, familyId: string, going: boolean) {
  const c = sb()
  if (going) await insertRsvp(eventId, personId, familyId)
  else await c.from('event_rsvps').delete().eq('event_id', eventId).eq('person_id', personId).then(({ error }) => log('rsvp.delete')(error))
}
export function deleteEventRow(eventId: string) {
  return sb().from('events').delete().eq('id', eventId).then(({ error }) => log('deleteEvent')(error))
}

export async function insertConversation(c0: Conversation, familyId: string) {
  const c = sb()
  await c.from('conversations').insert({ id: c0.id, family_id: familyId, type: c0.type, name: c0.name ?? null }).then(({ error }) => log('insertConv')(error))
  await c.from('conversation_members').insert(c0.memberIds.map((pid) => ({ conversation_id: c0.id, person_id: pid, family_id: familyId }))).then(({ error }) => log('convMembers')(error))
}
export function insertMessage(m: Message, familyId: string) {
  return sb().from('messages').insert({ id: m.id, conversation_id: m.conversationId, family_id: familyId, from_id: m.fromId, text: m.text }).then(({ error }) => log('insertMessage')(error))
}

export function insertAudit(a: AuditEntry, familyId: string) {
  return sb().from('audit_log').insert({ id: a.id, family_id: familyId, actor_id: a.actorId || null, action: a.action, target_id: a.targetId ?? null, summary: a.summary }).then(({ error }) => log('insertAudit')(error))
}
