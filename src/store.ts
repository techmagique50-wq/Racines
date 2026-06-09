import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildGraph, type FamilyGraph } from './family/engine'
import { hashPassword } from './lib/hash'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import * as repo from './lib/repo'
import { loadMyFamily, signIn as supaSignIn, signOut as supaSignOut, signUpAndOnboard } from './lib/auth'
import {
  ME_ID,
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
  AuditAction,
  AuditEntry,
  Conversation,
  EventKind,
  FamilyEvent,
  Filiation,
  Gender,
  Message,
  Person,
  Post,
  Role,
  Tribute,
  Union,
} from './family/types'

let counter = 1
// En mode réel (Supabase), les identifiants doivent être des UUID (clés Postgres).
const newId = (p: string) =>
  isSupabaseConfigured ? crypto.randomUUID() : `${p}_${counter++}_${Date.now().toString(36).slice(-4)}`

const fid = (get: () => State) => (isSupabaseConfigured ? get().familyId : null)
const friendlyAuthError = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? 'Erreur.'
  if (/invalid login/i.test(m)) return 'Email ou mot de passe incorrect.'
  if (/already registered|already exists/i.test(m)) return 'Un compte existe déjà avec cet email.'
  return m
}

const nameById = (persons: Person[], id?: string): string => {
  const p = id ? persons.find((x) => x.id === id) : undefined
  return p ? `${p.firstName} ${p.lastName}`.trim() : '—'
}

const AUDIT_BASE = 1_748_736_000_000
const seedAudit: AuditEntry[] = [
  { id: 'au_seed_1', actorId: 'marguerite', action: 'member.approve', targetId: 'carine', summary: 'Marguerite Mballa a approuvé Carine Mballa.', createdAt: AUDIT_BASE - 86_400_000 },
  { id: 'au_seed_2', actorId: 'joseph', action: 'event.add', summary: 'Joseph Mballa a créé un événement familial.', createdAt: AUDIT_BASE - 3 * 86_400_000 },
  { id: 'au_seed_3', actorId: 'marguerite', action: 'person.add', targetId: 'yannick', summary: 'Marguerite Mballa a ajouté Yannick Mballa à l’arbre.', createdAt: AUDIT_BASE - 5 * 86_400_000 },
]

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
  fatherName?: string
  motherName?: string
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
  guest: boolean
  meId: string
  posts: Post[]
  events: FamilyEvent[]
  conversations: Conversation[]
  messages: Message[]
  audit: AuditEntry[]
  theme: Theme
  /** Famille active (mode réel Supabase). null en mode démo. */
  familyId: string | null
  /** Session vérifiée / données chargées (mode réel). */
  hydrated: boolean

  graph: () => FamilyGraph
  toggleTheme: () => void
  /** Journalise une action dans l'historique (modération / traçabilité). */
  pushAudit: (action: AuditAction, summary: string, targetId?: string) => void

  // auth
  signup: (input: SignupInput) => Promise<AuthResult>
  login: (email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
  /** Mode visiteur : explorer la famille de démonstration sans compte. */
  enterGuest: () => void
  /** Au démarrage : vérifie la session Supabase et hydrate la famille. */
  bootstrap: () => Promise<void>
  /** Recharge l'état de la famille depuis Supabase (mode réel). */
  hydrate: () => Promise<void>

  // arbre
  addRelative: (person: Omit<Person, 'id'>, link: { type: 'parent' | 'child' | 'spouse'; relativeOf: string; confirmed?: boolean }) => string
  /** Relie une personne EXISTANTE (évite les doublons) au lieu d'en créer une. */
  linkExisting: (existingId: string, link: { type: 'parent' | 'child' | 'spouse'; relativeOf: string; confirmed?: boolean }) => void
  updatePerson: (id: string, patch: Partial<Person>) => void
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

  // modération (réservée aux gardiens, contrôlée côté UI)
  deletePost: (postId: string) => void
  deleteEvent: (eventId: string) => void
  setRole: (personId: string, role: Role) => void

  reset: () => void
}

const demoData = {
  persons: seedPersons,
  filiations: seedFiliations,
  unions: seedUnions,
  tributes: seedTributes,
  accounts: seedAccounts,
  posts: seedPosts,
  events: seedEvents,
  conversations: seedConversations,
  messages: seedMessages,
  audit: seedAudit,
}
const emptyData = {
  persons: [] as Person[],
  filiations: [] as Filiation[],
  unions: [] as Union[],
  tributes: [] as Tribute[],
  accounts: [] as Account[],
  posts: [] as Post[],
  events: [] as FamilyEvent[],
  conversations: [] as Conversation[],
  messages: [] as Message[],
  audit: [] as AuditEntry[],
}
const initial = {
  ...(isSupabaseConfigured ? emptyData : demoData),
  authId: null as string | null,
  guest: false,
  meId: '',
  familyId: null as string | null,
  hydrated: false,
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

      pushAudit: (action, summary, targetId) => {
        const entry = { id: newId('au'), actorId: get().meId, action, targetId, summary, createdAt: nowTs(get().audit) }
        set((s) => ({ audit: [entry, ...s.audit].slice(0, 500) }))
        const f = fid(get)
        if (f) repo.insertAudit(entry, f)
      },

      // ── Bootstrap / hydratation (mode réel Supabase) ──────────────────────────
      bootstrap: async () => {
        if (!isSupabaseConfigured || !supabase) { set({ hydrated: true }); return }
        const { data } = await supabase.auth.getSession()
        if (!data.session) { set({ authId: null, meId: '', familyId: null, hydrated: true }); return }
        await get().hydrate()
        set({ hydrated: true })
      },
      hydrate: async () => {
        if (!isSupabaseConfigured || !supabase) return
        const { data: u } = await supabase.auth.getUser()
        if (!u.user) { set({ authId: null, meId: '', familyId: null }); return }
        const fam = await loadMyFamily()
        if (!fam) { set({ authId: u.user.id, meId: '', familyId: null }); return }
        const st = await repo.loadFamilyState(fam.familyId)
        set({ ...st, authId: u.user.id, meId: fam.me?.id ?? '', familyId: fam.familyId, guest: false })
      },

      // ── Auth ────────────────────────────────────────────────────────────────
      signup: async (input) => {
        // Mode réel : Supabase Auth + onboarding serveur.
        if (isSupabaseConfigured) {
          const np = input.newPerson
          if (!np || !np.firstName.trim() || !np.lastName.trim())
            return { ok: false, error: 'Renseigne ton prénom et ton nom.' }
          if (input.password.length < 6)
            return { ok: false, error: 'Mot de passe : 6 caractères minimum.' }
          try {
            const { needsConfirmation } = await signUpAndOnboard({
              email: input.email, password: input.password,
              familyName: np.lastName, firstName: np.firstName, lastName: np.lastName, gender: np.gender, clan: np.clan,
            })
            if (needsConfirmation) return { ok: false, error: 'Compte créé. Confirme ton email puis connecte-toi.' }
          } catch (e) { return { ok: false, error: friendlyAuthError(e) } }
          await get().hydrate()
          // Père / mère déclarés → fiches + filiations confirmées.
          const meId = get().meId
          const addParent = (name: string, gender: Gender) => {
            const parts = name.trim().split(/\s+/)
            get().addRelative({ firstName: parts[0], lastName: parts.slice(1).join(' '), gender, state: 'vivant', avatar: gender === 'M' ? '🧑🏾' : '👩🏾' }, { type: 'parent', relativeOf: meId, confirmed: true })
          }
          if (meId && input.fatherName?.trim()) addParent(input.fatherName, 'M')
          if (meId && input.motherName?.trim()) addParent(input.motherName, 'F')
          return { ok: true }
        }

        // Mode démo (local).
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

        // Crée automatiquement les parents nommés (père / mère) + filiations.
        const addParent = (name: string, gender: Gender) => {
          const parts = name.trim().split(/\s+/)
          const pid = newId('p')
          const parent: Person = {
            id: pid,
            firstName: parts[0],
            lastName: parts.slice(1).join(' '),
            gender,
            state: 'vivant',
            avatar: gender === 'M' ? '🧑🏾' : '👩🏾',
          }
          set((s) => ({
            persons: [...s.persons, parent],
            filiations: [...s.filiations, { id: newId('f'), childId: personId!, parentId: pid, status: 'confirmed' }],
          }))
        }
        const curParents = get().filiations.filter((f) => f.childId === personId).map((f) => get().persons.find((p) => p.id === f.parentId))
        if (input.fatherName?.trim() && !curParents.some((p) => p?.gender === 'M')) addParent(input.fatherName, 'M')
        if (input.motherName?.trim() && !curParents.some((p) => p?.gender === 'F')) addParent(input.motherName, 'F')

        const account: Account = {
          id: newId('acc'),
          name: input.name.trim(),
          email,
          password: hashPassword(input.password),
          personId,
          createdAt: Date.now(),
        }
        set((s) => ({ accounts: [...s.accounts, account], authId: account.id, meId: personId!, guest: false }))
        get().pushAudit('account.signup', `${input.name.trim()} a rejoint la famille.`, personId)
        return { ok: true }
      },

      login: async (email, password) => {
        if (isSupabaseConfigured) {
          try { await supaSignIn(email, password) } catch (e) { return { ok: false, error: friendlyAuthError(e) } }
          await get().hydrate()
          return get().meId || get().authId ? { ok: true } : { ok: false, error: 'Connexion impossible.' }
        }
        const e = email.trim().toLowerCase()
        const acc = get().accounts.find((a) => a.email === e)
        if (!acc || acc.password !== hashPassword(password))
          return { ok: false, error: 'Email ou mot de passe incorrect.' }
        set({ authId: acc.id, meId: acc.personId, guest: false })
        return { ok: true }
      },

      logout: async () => {
        if (isSupabaseConfigured) {
          await supaSignOut()
          set({ ...emptyData, authId: null, meId: '', familyId: null, guest: false })
          return
        }
        set({ authId: null, guest: false })
      },
      enterGuest: () => set({ guest: true, meId: ME_ID }),

      // ── Arbre ───────────────────────────────────────────────────────────────
      addRelative: (person, link) => {
        const id = newId('p')
        const status: Filiation['status'] = link.confirmed ? 'confirmed' : 'pending'
        const f = fid(get)
        const newPerson: Person = { ...person, id }
        set((s) => ({ persons: [...s.persons, newPerson] }))
        let uni: Union | undefined
        let fil: Filiation | undefined
        if (link.type === 'spouse') {
          uni = { id: newId('u'), aId: link.relativeOf, bId: id, status }
          set((s) => ({ unions: [...s.unions, uni!] }))
        } else {
          const childId = link.type === 'child' ? id : link.relativeOf
          const parentId = link.type === 'parent' ? id : link.relativeOf
          fil = { id: newId('f'), childId, parentId, status }
          set((s) => ({ filiations: [...s.filiations, fil!] }))
        }
        if (f) {
          repo.insertPerson(newPerson, f)
          if (uni) repo.insertUnion(uni, f)
          if (fil) repo.insertFiliation(fil, f)
        }
        get().pushAudit('person.add', `${nameById(get().persons, get().meId)} a ajouté ${person.firstName} ${person.lastName} à l’arbre.`, id)
        return id
      },
      linkExisting: (existingId, link) => {
        const status: Filiation['status'] = link.confirmed ? 'confirmed' : 'pending'
        const f = fid(get)
        if (link.type === 'spouse') {
          const uni: Union = { id: newId('u'), aId: link.relativeOf, bId: existingId, status }
          set((s) => ({ unions: [...s.unions, uni] }))
          if (f) repo.insertUnion(uni, f)
        } else {
          const childId = link.type === 'child' ? existingId : link.relativeOf
          const parentId = link.type === 'parent' ? existingId : link.relativeOf
          const fil: Filiation = { id: newId('f'), childId, parentId, status }
          set((s) => ({ filiations: [...s.filiations, fil] }))
          if (f) repo.insertFiliation(fil, f)
        }
        get().pushAudit('link.add', `${nameById(get().persons, get().meId)} a proposé un lien avec ${nameById(get().persons, existingId)}.`, existingId)
      },
      updatePerson: (id, patch) => {
        set((s) => ({ persons: s.persons.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
        const f = fid(get)
        if (f) repo.updatePersonRow(id, patch, f)
        get().pushAudit('person.update', `${nameById(get().persons, get().meId)} a modifié le profil de ${nameById(get().persons, id)}.`, id)
      },
      confirmFiliation: (id) => {
        set((s) => ({ filiations: s.filiations.map((f) => (f.id === id ? { ...f, status: 'confirmed' } : f)) }))
        if (fid(get)) repo.setFiliationStatus(id)
        const fl = get().filiations.find((x) => x.id === id)
        get().pushAudit('link.confirm', `${nameById(get().persons, get().meId)} a confirmé un lien de filiation entre ${nameById(get().persons, fl?.childId)} et ${nameById(get().persons, fl?.parentId)}.`, fl?.childId)
      },
      confirmUnion: (id) => {
        set((s) => ({ unions: s.unions.map((u) => (u.id === id ? { ...u, status: 'confirmed' } : u)) }))
        if (fid(get)) repo.setUnionStatus(id)
        const u = get().unions.find((x) => x.id === id)
        get().pushAudit('link.confirm', `${nameById(get().persons, get().meId)} a confirmé l’union entre ${nameById(get().persons, u?.aId)} et ${nameById(get().persons, u?.bId)}.`, u?.aId)
      },

      approveMember: (personId) => {
        const name = nameById(get().persons, personId)
        set((s) => ({
          filiations: s.filiations.map((f) =>
            (f.childId === personId || f.parentId === personId) && f.status === 'pending' ? { ...f, status: 'confirmed' } : f,
          ),
          unions: s.unions.map((u) =>
            (u.aId === personId || u.bId === personId) && u.status === 'pending' ? { ...u, status: 'confirmed' } : u,
          ),
          persons: s.persons.map((p) => (p.id === personId ? { ...p, role: p.role && p.role !== 'attente' ? p.role : 'membre' } : p)),
        }))
        const fa = fid(get)
        if (fa) repo.approveMemberRows(personId, fa, get().persons.find((p) => p.id === personId)?.role ?? 'membre')
        get().pushAudit('member.approve', `${nameById(get().persons, get().meId)} a approuvé ${name}.`, personId)
      },

      refuseMember: (personId) => {
        const name = nameById(get().persons, personId)
        set((s) => {
          const filiations = s.filiations.filter((f) => !((f.childId === personId || f.parentId === personId) && f.status === 'pending'))
          const unions = s.unions.filter((u) => !((u.aId === personId || u.bId === personId) && u.status === 'pending'))
          const stillLinked =
            filiations.some((f) => f.childId === personId || f.parentId === personId) ||
            unions.some((u) => u.aId === personId || u.bId === personId)
          return { filiations, unions, persons: stillLinked ? s.persons : s.persons.filter((p) => p.id !== personId) }
        })
        const fr = fid(get)
        if (fr) repo.refuseMemberRows(personId, fr, !get().persons.some((p) => p.id === personId))
        get().pushAudit('member.refuse', `${nameById(get().persons, get().meId)} a refusé la demande de ${name}.`, personId)
      },
      addTribute: (personId, kind, authorName, text) => {
        const t: Tribute = { id: newId('t'), personId, kind, authorName, text, createdAt: nowTs(get().tributes) }
        set((s) => ({ tributes: [t, ...s.tributes] }))
        const f = fid(get)
        if (f) repo.insertTribute(t, f)
      },

      mergePersons: (keepId, mergeId) => {
        const keepName = nameById(get().persons, keepId)
        const mergeName = nameById(get().persons, mergeId)
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
        })
        if (keepId !== mergeId) get().pushAudit('person.merge', `${nameById(get().persons, get().meId)} a fusionné « ${mergeName} » dans « ${keepName} ».`, keepId)
      },

      // ── Fil ─────────────────────────────────────────────────────────────────
      addPost: (text, memoryOf) => {
        const post: Post = { id: newId('po'), authorId: get().meId, text, memoryOf, createdAt: nowTs(get().posts), likes: [], comments: [] }
        set((s) => ({ posts: [post, ...s.posts] }))
        const f = fid(get)
        if (f) repo.insertPost(post, f)
        get().pushAudit('post.add', `${nameById(get().persons, get().meId)} a publié sur le fil.`, get().meId)
      },
      toggleLike: (postId) => {
        const me = get().meId
        const had = get().posts.find((p) => p.id === postId)?.likes.includes(me) ?? false
        set((s) => ({
          posts: s.posts.map((p) => {
            if (p.id !== postId) return p
            const has = p.likes.includes(me)
            return { ...p, likes: has ? p.likes.filter((l) => l !== me) : [...p.likes, me] }
          }),
        }))
        const f = fid(get)
        if (f) repo.toggleLikeRow(postId, me, f, !had)
      },
      addComment: (postId, text) => {
        const comment = { id: newId('c'), authorId: get().meId, text, createdAt: nowTs(get().posts.find((p) => p.id === postId)?.comments ?? []) }
        set((s) => ({
          posts: s.posts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p)),
        }))
        const f = fid(get)
        if (f) repo.insertComment(postId, comment, f)
      },

      // ── Événements ───────────────────────────────────────────────────────────
      createEvent: (data) => {
        const ev: FamilyEvent = { id: newId('ev'), ...data, organizerId: get().meId, participants: [get().meId], createdAt: nowTs(get().events) }
        set((s) => ({ events: [ev, ...s.events] }))
        const f = fid(get)
        if (f) repo.insertEvent(ev, f)
        get().pushAudit('event.add', `${nameById(get().persons, get().meId)} a créé l’événement « ${data.title} ».`, ev.id)
      },
      toggleRsvp: (eventId) => {
        const me = get().meId
        const going = !(get().events.find((e) => e.id === eventId)?.participants.includes(me) ?? false)
        set((s) => ({
          events: s.events.map((e) => {
            if (e.id !== eventId) return e
            const has = e.participants.includes(me)
            return { ...e, participants: has ? e.participants.filter((p) => p !== me) : [...e.participants, me] }
          }),
        }))
        const f = fid(get)
        if (f) repo.toggleRsvpRow(eventId, me, f, going)
      },

      // ── Messagerie ────────────────────────────────────────────────────────────
      startDirect: (otherPersonId) => {
        const me = get().meId
        const existing = get().conversations.find(
          (c) => c.type === 'direct' && c.memberIds.length === 2 && c.memberIds.includes(me) && c.memberIds.includes(otherPersonId),
        )
        if (existing) return existing.id
        const conv: Conversation = { id: newId('cv'), type: 'direct', memberIds: [me, otherPersonId], createdAt: Date.now() }
        set((s) => ({ conversations: [...s.conversations, conv] }))
        const f = fid(get)
        if (f) repo.insertConversation(conv, f)
        return conv.id
      },
      createGroup: (name, memberIds) => {
        const me = get().meId
        const members = Array.from(new Set([me, ...memberIds]))
        const conv: Conversation = { id: newId('cv'), type: 'group', name: name.trim() || 'Groupe familial', memberIds: members, createdAt: Date.now() }
        set((s) => ({ conversations: [...s.conversations, conv] }))
        const f = fid(get)
        if (f) repo.insertConversation(conv, f)
        return conv.id
      },
      sendMessage: (conversationId, text) => {
        const msg: Message = { id: newId('m'), conversationId, fromId: get().meId, text, createdAt: nowTs(get().messages) }
        set((s) => ({ messages: [...s.messages, msg] }))
        const f = fid(get)
        if (f) repo.insertMessage(msg, f)
      },

      // ── Modération ───────────────────────────────────────────────────────────
      deletePost: (postId) => {
        const post = get().posts.find((p) => p.id === postId)
        const author = nameById(get().persons, post?.authorId)
        set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) }))
        if (fid(get)) repo.deletePostRow(postId)
        get().pushAudit('post.delete', `${nameById(get().persons, get().meId)} a supprimé une publication de ${author}.`, post?.authorId)
      },
      deleteEvent: (eventId) => {
        const ev = get().events.find((e) => e.id === eventId)
        set((s) => ({ events: s.events.filter((e) => e.id !== eventId) }))
        if (fid(get)) repo.deleteEventRow(eventId)
        get().pushAudit('event.delete', `${nameById(get().persons, get().meId)} a supprimé l’événement « ${ev?.title ?? '—'} ».`, ev?.organizerId)
      },
      setRole: (personId, role) => {
        set((s) => ({ persons: s.persons.map((p) => (p.id === personId ? { ...p, role } : p)) }))
        if (fid(get)) repo.setRoleRow(personId, role)
        get().pushAudit('person.role', `${nameById(get().persons, get().meId)} a donné le rôle « ${role} » à ${nameById(get().persons, personId)}.`, personId)
      },

      reset: () => set({ ...initial, theme: get().theme }),
    }),
    {
      // Clé distincte en mode réel : on n'y cache QUE le thème (les données de
      // famille vivent sur Supabase, jamais en localStorage).
      name: isSupabaseConfigured ? 'racines-supabase' : 'racines-store',
      version: 3,
      partialize: (s) => (isSupabaseConfigured ? { theme: s.theme } : s),
      // v2 → v3 : ajout du journal d'activité (audit) — uniquement en mode démo.
      migrate: (persisted, version) => {
        const s = persisted as Partial<State>
        if (!isSupabaseConfigured && version < 3 && !s.audit) s.audit = seedAudit
        return s as State
      },
    },
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
