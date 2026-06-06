// ── Modèle de données RACINES ────────────────────────────────────────────────

export type Gender = 'M' | 'F'

/** Un profil est soit vivant, soit en « mémoire » (défunt). */
export type LifeState = 'vivant' | 'memoire'

/** Rôles de gouvernance familiale. */
export type Role = 'gardien' | 'membre' | 'attente' | 'invite'

export type LinkStatus = 'confirmed' | 'pending'

export interface Person {
  id: string
  firstName: string
  lastName: string
  nickname?: string
  gender: Gender
  /** Clé d'appartenance africaine. */
  clan?: string
  lignage?: string
  /** Ancêtre-pivot : fondateur autour duquel se rattache la lignée. */
  isPivot?: boolean
  birthYear?: number
  deathYear?: number
  state: LifeState
  village?: string // village d'origine
  country?: string // pays de résidence (diaspora)
  city?: string // ville de résidence
  profession?: string
  avatar?: string // emoji léger (pas d'image lourde)
  photo?: string
  bio?: string
  phone?: string
  role?: Role
  /** Gardien qui valide / parle pour ce profil (défunts, anciens sans tel). */
  guardianId?: string
}

/** Filiation : `childId` est l'enfant de `parentId`. */
export interface Filiation {
  id: string
  childId: string
  parentId: string
  status: LinkStatus
}

/** Union : couple entre `aId` et `bId` (rank = ordre d'épouse pour la polygamie). */
export interface Union {
  id: string
  aId: string
  bId: string
  status: LinkStatus
  rank?: number
}

/** Contribution à la page mémoire d'un défunt. */
export interface Tribute {
  id: string
  personId: string
  kind: 'histoire' | 'temoignage' | 'photo' | 'audio'
  authorName: string
  text?: string
  createdAt: number
}

export const ROLE_LABEL: Record<Role, { label: string; color: string }> = {
  gardien: { label: 'Gardien', color: '#C8962E' },
  membre: { label: 'Membre', color: '#2E7D6F' },
  attente: { label: 'En attente', color: '#B5532A' },
  invite: { label: 'Invité', color: '#8a8a8a' },
}

// ── Couche réseau social ─────────────────────────────────────────────────────

/** Compte utilisateur, rattaché à un membre (Person) de l'arbre. */
export interface Account {
  id: string
  name: string
  email: string
  password: string // haché (démo)
  personId: string // membre correspondant dans l'arbre
  createdAt: number
}

export interface Comment {
  id: string
  authorId: string // personId
  text: string
  createdAt: number
}

/** Publication sur le mur de la grande famille. */
export interface Post {
  id: string
  authorId: string // personId
  text: string
  photo?: string
  memoryOf?: string // souvenir rattaché à un membre (souvent un défunt)
  createdAt: number
  likes: string[] // personId[]
  comments: Comment[]
}

export type EventKind = 'mariage' | 'deuil' | 'naissance' | 'retrouvailles' | 'bapteme' | 'autre'

export interface FamilyEvent {
  id: string
  kind: EventKind
  title: string
  date: string // ISO (YYYY-MM-DD)
  place?: string
  description?: string
  organizerId: string // personId
  participants: string[] // personId[]
  createdAt: number
}

export const EVENT_KIND: Record<EventKind, { label: string; emoji: string }> = {
  mariage: { label: 'Mariage', emoji: '💍' },
  deuil: { label: 'Deuil', emoji: '🕯️' },
  naissance: { label: 'Naissance', emoji: '👶🏾' },
  retrouvailles: { label: 'Retrouvailles', emoji: '🎉' },
  bapteme: { label: 'Baptême', emoji: '✨' },
  autre: { label: 'Événement', emoji: '📌' },
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  name?: string // pour les groupes
  memberIds: string[] // personId[]
  createdAt: number
}

export interface Message {
  id: string
  conversationId: string
  fromId: string // personId
  text: string
  createdAt: number
}
