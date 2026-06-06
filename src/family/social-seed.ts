// ── Données sociales de démonstration ────────────────────────────────────────
import { hashPassword } from '../lib/hash'
import type {
  Account,
  Conversation,
  FamilyEvent,
  Message,
  Post,
} from './types'

const DAY = 86_400_000
const T0 = 1_748_736_000_000
const T = (d: number) => T0 - d * DAY

export const seedAccounts: Account[] = [
  { id: 'acc_herve', name: 'Hervé Mballa', email: 'herve@famille.cm', password: hashPassword('demo1234'), personId: 'herve', createdAt: T(60) },
  { id: 'acc_jean', name: 'Jean Mballa', email: 'jean@famille.cm', password: hashPassword('demo1234'), personId: 'jean', createdAt: T(58) },
  { id: 'acc_marg', name: 'Marguerite Mballa', email: 'marguerite@famille.cm', password: hashPassword('demo1234'), personId: 'marguerite', createdAt: T(55) },
]

export const seedPosts: Post[] = [
  {
    id: 'po1', authorId: 'marguerite', createdAt: T(3),
    text: "Souvenir de Pa Ondoua sous le manguier, entouré de tous ses petits-enfants. Que sa mémoire nous garde unis. 🙏",
    memoryOf: 'ondoua', likes: ['herve', 'jean', 'sandrine', 'carine'],
    comments: [{ id: 'c1', authorId: 'jean', text: "Quelle époque… merci Tantine.", createdAt: T(3) + 3600_000 }],
  },
  {
    id: 'po2', authorId: 'carine', createdAt: T(1),
    text: "Bonjour la grande famille depuis Montréal ! ❄️ Les enfants demandent quand est la prochaine retrouvaille au village 😊",
    likes: ['herve', 'sandrine', 'marguerite'], comments: [],
  },
  {
    id: 'po3', authorId: 'sandrine', createdAt: T(0),
    text: "Photos de la réunion de dimanche à Yaoundé bientôt en ligne. C'était magnifique de voir 4 générations réunies ❤️",
    likes: ['herve', 'jean'], comments: [{ id: 'c2', authorId: 'herve', text: "Vivement les photos !", createdAt: T(0) + 1800_000 }],
  },
]

export const seedEvents: FamilyEvent[] = [
  { id: 'ev1', kind: 'retrouvailles', title: 'Grande retrouvaille de la famille Mballa', date: '2026-08-15', place: 'Mbalmayo (village)', organizerId: 'marguerite', description: "Rassemblement annuel de toute la lignée. Repas, hommages aux aînés, et mise à jour de l'arbre.", participants: ['herve', 'jean', 'sandrine', 'carine'], createdAt: T(10) },
  { id: 'ev2', kind: 'bapteme', title: "Baptême du fils d'Hervé", date: '2026-07-12', place: 'Douala', organizerId: 'herve', participants: ['herve', 'sandrine'], createdAt: T(5) },
]

export const seedConversations: Conversation[] = [
  { id: 'cv_direct1', type: 'direct', memberIds: ['herve', 'jean'], createdAt: T(4) },
  { id: 'cv_group1', type: 'group', name: 'Grande famille Mballa', memberIds: ['herve', 'jean', 'sandrine', 'carine', 'marguerite'], createdAt: T(30) },
]

export const seedMessages: Message[] = [
  { id: 'm1', conversationId: 'cv_direct1', fromId: 'jean', text: "Cousin ! Tu viens à la retrouvaille en août ?", createdAt: T(4) },
  { id: 'm2', conversationId: 'cv_direct1', fromId: 'herve', text: "Bien sûr, je réserve déjà 👍", createdAt: T(4) + 1200_000 },
  { id: 'm3', conversationId: 'cv_group1', fromId: 'marguerite', text: "Mes enfants, n'oubliez pas la cotisation pour le village.", createdAt: T(2) },
  { id: 'm4', conversationId: 'cv_group1', fromId: 'carine', text: "C'est noté Tantine, j'envoie ma part cette semaine.", createdAt: T(2) + 2400_000 },
]
