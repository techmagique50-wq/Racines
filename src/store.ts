import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildGraph, type FamilyGraph } from './family/engine'
import { hashPassword } from './lib/hash'
import {
  seedFiliations,
  seedPersons,
  seedTributes,
  seedUnions,
} from './family/seed'
import {
  seedAccounts,
  seedConversations,
  seedEvents,
  seedMessages,
  seedPosts,
} from './family/social-seed'
import type {
  Account,
  Conversation,
  EventKind,
  FamilyEvent,
  Filiation,
  Gender,
  Message,
  Person,
  Post,
  Tribute,
  Union,
} from './family/types'

let counter = 1
const newId = (p: string) => `${p}_${counter++}_${Date.now().toString(36).slice(-4)}`

export type Theme = 'light' | 'dark'
export interface AuthResult {
  ok: boolean
  error?: string
}

interface SignupInput {
  name: string
  email: string
  password: string
  claimPersonId?: string
  newPerson?: { firstName: string; lastName: string; gender: Gender; clan?: string; village?: string; city?: string }
}

interface State {
  // arbre
  persons: Person[]
  filiations: Filiation[]
  unions: Union[]
  tributes: Tribute[]
  // social
  accounts: Account[]
  authId: string | null
  meId: string
  posts: Post[]
  events: FamilyEvent[]
  conversations: Conversation[]
  messages: Message[]
  theme: Theme

  graph: () => FamilyGraph
  toggleTheme: () => void

  // auth
  signup: (input: SignupInput) => AuthResult
  login: (email: string, password: string) => AuthResult
  logout: () => void

  // arbre
  addRelative: (person: Omit<Person, 'id'>, link: { type: 'parent' | 'child' | 'spouse'; relativeOf: string; confirmed?: boolean }) => string
  confirmFiliation: (id: string) => void
  confirmUnion: (id: string) => void
  approveMember: (personId: string) => void
  refuseMember: (personId: string) => void
  /** Fusionne deux fiches du même ancêtre : tout est recible sur `keepId`. */
  mergePersons: (keepId: string, mergeId: string) => void
  addTribute: (personId: string, kind: Tribute['kind'], authorName: string, text: string) => void

  // fil
  addPost: (text: string, memoryOf?: string) => void
  toggleLike: (postId: string) => void
  addComment: (postId: string, text: string) => void

  // événements
  createEvent: (data: { kind: EventKind; title: string; date: string; place?: string; description?: string }) => void
  toggleRsvp: (eventId: string) => void

  // messagerie
  startDirect: (otherPersonId: string) => string
  createGroup: (name: string, memberIds: string[]) => string
  sendMessage: (conversationId: string, text: string) => void

  reset: () => void
}

const initial = {
  persons: seedPersons,
  filiations: seedFiliations,
  unions: seedUnions,
  tributes: seedTributes,
  accounts: seedAccounts,
  authId: null as string | null,
  meId: '',
  posts: seedPosts,
  events: seedEvents,
  conversations: seedConversations,
  messages: seedMessages,
}

function nowTs(arr: { createdAt: number }[]): number {
  return arr.reduce((m, x) => Math.max(m, x.createdAt), 0) + 60_000
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,
      theme: 'light',

      graph: () => buildGraph(get().persons, get().filiations, get().unions),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

      // ── Auth ────────────────────────────────────────────────────────────────
      signup: (input) => {
        const email = input.email.trim().toLowerCase()
        if (!input.name.trim() || !email || input.password.length < 4)
          return { ok: false, error: 'Nom, email et mot de passe (4+ caractères) requis.' }
        if (get().accounts.some((a) => a.email === email))
          return { ok: false, error: 'Un compte existe déjà avec cet email.' }

        let personId = input.claimPersonId
        if (!personId && input.newPerson) {
          personId = newId('p')
          const np = input.newPerson
          const person: Person = {
            id: personId,
            firstName: np.firstName.trim(),
            lastName: np.lastName.trim(),
            gender: np.gender,
            state: 'vivant',
            clan: np.clan,
            village: np.village,
            city: np.city,
            role: 'membre',
            avatar: np.gender === 'M' ? '🧑🏾' : '👩🏾',
          }
          set((s) => ({ persons: [...s.persons, person] }))
        }
        if (!personId) return { ok: false, error: 'Choisis ton profil ou crée-en un.' }

        const account: Account = {
          id: newId('acc'),
          name: input.name.trim(),
          email,
          password: hashPassword(input.password),
          personId,
          createdAt: Date.now(),
        }
        set((s) => ({ accounts: [...s.accounts, account], authId: account.id, meId: personId! }))
        return { ok: true }
      },

      login: (email, password) => {
        const e = email.trim().toLowerCase()
        const acc = get().accounts.find((a) => a.email === e)
        if (!acc || acc.password !== hashPassword(password))
          return { ok: false, error: 'Email ou mot de passe incorrect.' }
        set({ authId: acc.id, meId: acc.personId })
        return { ok: true }
      },

      logout: () => set({ authId: null }),

      // ── Arbre ───────────────────────────────────────────────────────────────
      addRelative: (person, link) => {
        const id = newId('p')
        const status = link.confirmed ? 'confirmed' : 'pending'
        set((s) => ({ persons: [...s.persons, { ...person, id }] }))
        if (link.type === 'spouse') {
          set((s) => ({ unions: [...s.unions, { id: newId('u'), aId: link.relativeOf, bId: id, status }] }))
        } else {
          const childId = link.type === 'child' ? id : link.relativeOf
          const parentId = link.type === 'parent' ? id : link.relativeOf
          set((s) => ({ filiations: [...s.filiations, { id: newId('f'), childId, parentId, status }] }))
        }
        return id
      },
      confirmFiliation: (id) => set((s) => ({ filiations: s.filiations.map((f) => (f.id === id ? { ...f, status: 'confirmed' } : f)) })),
      confirmUnion: (id) => set((s) => ({ unions: s.unions.map((u) => (u.id === id ? { ...u, status: 'confirmed' } : u)) })),

      approveMember: (personId) =>
        set((s) => ({
          filiations: s.filiations.map((f) =>
            (f.childId === personId || f.parentId === personId) && f.status === 'pending' ? { ...f, status: 'confirmed' } : f,
          ),
          unions: s.unions.map((u) =>
            (u.aId === personId || u.bId === personId) && u.status === 'pending' ? { ...u, status: 'confirmed' } : u,
          ),
          persons: s.persons.map((p) => (p.id === personId ? { ...p, role: p.role && p.role !== 'attente' ? p.role : 'membre' } : p)),
        })),

      refuseMember: (personId) =>
        set((s) => {
          const filiations = s.filiations.filter((f) => !((f.childId === personId || f.parentId === personId) && f.status === 'pending'))
          const unions = s.unions.filter((u) => !((u.aId === personId || u.bId === personId) && u.status === 'pending'))
          const stillLinked =
            filiations.some((f) => f.childId === personId || f.parentId === personId) ||
            unions.some((u) => u.aId === personId || u.bId === personId)
          return { filiations, unions, persons: stillLinked ? s.persons : s.persons.filter((p) => p.id !== personId) }
        }),
      addTribute: (personId, kind, authorName, text) =>
        set((s) => ({ tributes: [{ id: newId('t'), personId, kind, authorName, text, createdAt: nowTs(s.tributes) }, ...s.tributes] })),

      mergePersons: (keepId, mergeId) =>
        set((s) => {
          if (keepId === mergeId) return {}
          const swap = (id: string) => (id === mergeId ? keepId : id)

          // filiations : recibler + retirer boucles + dédupliquer
          const seenF = new Set<string>()
          const filiations = s.filiations
            .map((f) => ({ ...f, childId: swap(f.childId), parentId: swap(f.parentId) }))
            .filter((f) => f.childId !== f.parentId)
            .filter((f) => { const k = `${f.childId}<${f.parentId}`; if (seenF.has(k)) return false; seenF.add(k); return true })

          // unions : recibler + retirer boucles + dédupliquer (paire non ordonnée)
          const seenU = new Set<string>()
          const unions = s.unions
            .map((u) => ({ ...u, aId: swap(u.aId), bId: swap(u.bId) }))
            .filter((u) => u.aId !== u.bId)
            .filter((u) => { const k = [u.aId, u.bId].sort().join('~'); if (seenU.has(k)) return false; seenU.add(k); return true })

          // fusion des champs (on garde keep, on complète avec merge)
          const keep = s.persons.find((p) => p.id === keepId)
          const merged = s.persons.find((p) => p.id === mergeId)
          const persons = s.persons
            .filter((p) => p.id !== mergeId)
            .map((p) => {
              if (p.id !== keepId || !keep || !merged) return p
              return {
                ...keep,
                nickname: keep.nickname ?? merged.nickname,
                clan: keep.clan ?? merged.clan,
                lignage: keep.lignage ?? merged.lignage,
                birthYear: keep.birthYear ?? merged.birthYear,
                deathYear: keep.deathYear ?? merged.deathYear,
                village: keep.village ?? merged.village,
                city: keep.city ?? merged.city,
                country: keep.country ?? merged.country,
                profession: keep.profession ?? merged.profession,
                bio: keep.bio ?? merged.bio,
                phone: keep.phone ?? merged.phone,
                photo: keep.photo ?? merged.photo,
                isPivot: keep.isPivot || merged.isPivot,
              }
            })

          return {
            persons,
            filiations,
            unions,
            tributes: s.tributes.map((t) => ({ ...t, personId: swap(t.personId) })),
            posts: s.posts.map((po) => ({
              ...po,
              authorId: swap(po.authorId),
              memoryOf: po.memoryOf ? swap(po.memoryOf) : po.memoryOf,
              likes: Array.from(new Set(po.likes.map(swap))),
              comments: po.comments.map((c) => ({ ...c, authorId: swap(c.authorId) })),
            })),
            events: s.events.map((e) => ({ ...e, organizerId: swap(e.organizerId), participants: Array.from(new Set(e.participants.map(swap))) })),
            conversations: s.conversations.map((c) => ({ ...c, memberIds: Array.from(new Set(c.memberIds.map(swap))) })),
            messages: s.messages.map((m) => ({ ...m, fromId: swap(m.fromId) })),
            accounts: s.accounts.map((a) => ({ ...a, personId: swap(a.personId) })),
            meId: swap(s.meId),
          }
        }),

      // ── Fil ─────────────────────────────────────────────────────────────────
      addPost: (text, memoryOf) =>
        set((s) => ({
          posts: [{ id: newId('po'), authorId: s.meId, text, memoryOf, createdAt: nowTs(s.posts), likes: [], comments: [] }, ...s.posts],
        })),
      toggleLike: (postId) =>
        set((s) => ({
          posts: s.posts.map((p) => {
            if (p.id !== postId) return p
            const has = p.likes.includes(s.meId)
            return { ...p, likes: has ? p.likes.filter((l) => l !== s.meId) : [...p.likes, s.meId] }
          }),
        })),
      addComment: (postId, text) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId ? { ...p, comments: [...p.comments, { id: newId('c'), authorId: s.meId, text, createdAt: nowTs(p.comments) }] } : p,
          ),
        })),

      // ── Événements ───────────────────────────────────────────────────────────
      createEvent: (data) =>
        set((s) => ({
          events: [{ id: newId('ev'), ...data, organizerId: s.meId, participants: [s.meId], createdAt: nowTs(s.events) }, ...s.events],
        })),
      toggleRsvp: (eventId) =>
        set((s) => ({
          events: s.events.map((e) => {
            if (e.id !== eventId) return e
            const has = e.participants.includes(s.meId)
            return { ...e, participants: has ? e.participants.filter((p) => p !== s.meId) : [...e.participants, s.meId] }
          }),
        })),

      // ── Messagerie ────────────────────────────────────────────────────────────
      startDirect: (otherPersonId) => {
        const me = get().meId
        const existing = get().conversations.find(
          (c) => c.type === 'direct' && c.memberIds.length === 2 && c.memberIds.includes(me) && c.memberIds.includes(otherPersonId),
        )
        if (existing) return existing.id
        const id = newId('cv')
        set((s) => ({ conversations: [...s.conversations, { id, type: 'direct', memberIds: [me, otherPersonId], createdAt: Date.now() }] }))
        return id
      },
      createGroup: (name, memberIds) => {
        const me = get().meId
        const members = Array.from(new Set([me, ...memberIds]))
        const id = newId('cv')
        set((s) => ({ conversations: [...s.conversations, { id, type: 'group', name: name.trim() || 'Groupe familial', memberIds: members, createdAt: Date.now() }] }))
        return id
      },
      sendMessage: (conversationId, text) =>
        set((s) => ({
          messages: [...s.messages, { id: newId('m'), conversationId, fromId: s.meId, text, createdAt: nowTs(s.messages) }],
        })),

      reset: () => set({ ...initial, theme: get().theme }),
    }),
    { name: 'racines-store', version: 2 },
  ),
)

// ── Sélecteurs ────────────────────────────────────────────────────────────────
export const useMe = () => {
  const meId = useStore((s) => s.meId)
  return useStore((s) => s.persons.find((p) => p.id === meId))!
}
export const useAccount = () => {
  const authId = useStore((s) => s.authId)
  return useStore((s) => s.accounts.find((a) => a.id === authId) ?? null)
}
