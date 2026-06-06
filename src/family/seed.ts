// ── Famille de démonstration : lignée Mballa (clan Essomba) ──────────────────
// 4 générations · ancêtre-pivot · polygamie (co-épouses) · profils mémoire ·
// diaspora. « Toi » par défaut = Hervé Mballa (génération 3).

import type { Filiation, Person, Tribute, Union } from './types'

export const ME_ID = 'herve'
const CLAN = 'Essomba'
const LIGNAGE = 'Mballa'

export const seedPersons: Person[] = [
  // ── Génération 0 — l'ancêtre-pivot ─────────────────────────────────────────
  { id: 'ondoua', firstName: 'Ondoua', lastName: 'Mballa', nickname: 'Pa Ondoua', gender: 'M', clan: CLAN, lignage: LIGNAGE, isPivot: true, birthYear: 1910, deathYear: 1985, state: 'memoire', village: 'Mbalmayo', avatar: '🌳', bio: "Fondateur de la lignée Mballa, cultivateur et notable respecté de Mbalmayo." },
  { id: 'akono', firstName: 'Akono', lastName: 'Mballa', nickname: '1ʳᵉ épouse', gender: 'F', clan: 'Ngono', isPivot: false, birthYear: 1915, deathYear: 1990, state: 'memoire', village: 'Mbalmayo', avatar: '👵🏾' },
  { id: 'bella', firstName: 'Bella', lastName: 'Mballa', nickname: '2ᵉ épouse', gender: 'F', clan: 'Abena', birthYear: 1922, deathYear: 1998, state: 'memoire', village: 'Sangmélima', avatar: '👵🏾' },

  // ── Génération 1 ───────────────────────────────────────────────────────────
  { id: 'etienne', firstName: 'Étienne', lastName: 'Mballa', gender: 'M', clan: CLAN, lignage: LIGNAGE, birthYear: 1945, deathYear: 2010, state: 'memoire', village: 'Mbalmayo', profession: 'Instituteur', avatar: '🧓🏾', bio: "Premier enseignant de la famille. A inspiré des générations d'élèves." },
  { id: 'marguerite', firstName: 'Marguerite', lastName: 'Mballa', gender: 'F', clan: CLAN, lignage: LIGNAGE, birthYear: 1948, state: 'vivant', village: 'Mbalmayo', city: 'Yaoundé', country: 'Cameroun', role: 'gardien', avatar: '👩🏾‍🦳', bio: "Gardienne de la mémoire familiale." },
  { id: 'joseph', firstName: 'Joseph', lastName: 'Mballa', gender: 'M', clan: CLAN, lignage: LIGNAGE, birthYear: 1952, state: 'vivant', city: 'Yaoundé', country: 'Cameroun', role: 'gardien', avatar: '🧓🏾' },
  { id: 'pauline', firstName: 'Pauline', lastName: 'Mballa', gender: 'F', clan: CLAN, lignage: LIGNAGE, birthYear: 1956, deathYear: 2019, state: 'memoire', avatar: '👵🏾' },

  // conjoints gen1
  { id: 'cecile', firstName: 'Cécile', lastName: 'Ngono', gender: 'F', clan: 'Ngono', birthYear: 1950, state: 'vivant', city: 'Yaoundé', country: 'Cameroun', avatar: '👩🏾' },
  { id: 'rose', firstName: 'Rose', lastName: 'Abena', gender: 'F', clan: 'Abena', birthYear: 1958, state: 'vivant', city: 'Douala', country: 'Cameroun', avatar: '👩🏾' },
  { id: 'paul', firstName: 'Paul', lastName: 'Eyenga', gender: 'M', clan: 'Eyenga', birthYear: 1944, deathYear: 2015, state: 'memoire', avatar: '🧓🏾' },

  // ── Génération 2 ───────────────────────────────────────────────────────────
  { id: 'jean', firstName: 'Jean', lastName: 'Mballa', gender: 'M', clan: CLAN, lignage: LIGNAGE, birthYear: 1972, state: 'vivant', village: 'Mbalmayo', city: 'Paris', country: 'France', profession: 'Ingénieur', avatar: '🧑🏾', role: 'membre' },
  { id: 'sandrine', firstName: 'Sandrine', lastName: 'Mballa', gender: 'F', clan: CLAN, lignage: LIGNAGE, birthYear: 1975, state: 'vivant', city: 'Yaoundé', country: 'Cameroun', avatar: '👩🏾', role: 'membre' },
  { id: 'herve', firstName: 'Hervé', lastName: 'Mballa', gender: 'M', clan: CLAN, lignage: LIGNAGE, birthYear: 1980, state: 'vivant', city: 'Douala', country: 'Cameroun', profession: 'Comptable', avatar: '🧑🏾', role: 'membre', bio: "C'est toi 👋" },
  { id: 'carine', firstName: 'Carine', lastName: 'Mballa', gender: 'F', clan: CLAN, lignage: LIGNAGE, birthYear: 1983, state: 'vivant', city: 'Montréal', country: 'Canada', avatar: '👩🏾', role: 'membre' },
  { id: 'bruno', firstName: 'Bruno', lastName: 'Eyenga', gender: 'M', clan: 'Eyenga', birthYear: 1976, state: 'vivant', city: 'Yaoundé', country: 'Cameroun', avatar: '🧑🏾' },

  // conjoints gen2
  { id: 'aurelie', firstName: 'Aurélie', lastName: 'Mballa', gender: 'F', clan: 'Durand', birthYear: 1982, state: 'vivant', city: 'Paris', country: 'France', avatar: '👩🏼' },
  { id: 'nadege', firstName: 'Nadège', lastName: 'Mballa', gender: 'F', clan: 'Tchami', birthYear: 1985, state: 'vivant', city: 'Douala', country: 'Cameroun', avatar: '👩🏾' },

  // ── Génération 3 ───────────────────────────────────────────────────────────
  { id: 'lucas', firstName: 'Lucas', lastName: 'Mballa', gender: 'M', clan: CLAN, lignage: LIGNAGE, birthYear: 2005, state: 'vivant', city: 'Paris', country: 'France', avatar: '👦🏾' },
  { id: 'emma', firstName: 'Emma', lastName: 'Mballa', gender: 'F', clan: CLAN, lignage: LIGNAGE, birthYear: 2008, state: 'vivant', city: 'Paris', country: 'France', avatar: '👧🏾' },
  { id: 'yannick', firstName: 'Yannick', lastName: 'Mballa', gender: 'M', clan: CLAN, lignage: LIGNAGE, birthYear: 2010, state: 'vivant', city: 'Douala', country: 'Cameroun', avatar: '👦🏾' },
]

export const seedFiliations: Filiation[] = [
  // gen1 enfants d'Ondoua (+ mère, discriminant co-épouses)
  f('etienne', 'ondoua'), f('etienne', 'akono'),
  f('marguerite', 'ondoua'), f('marguerite', 'akono'),
  f('joseph', 'ondoua'), f('joseph', 'bella'),
  f('pauline', 'ondoua'), f('pauline', 'bella'),
  // gen2
  f('jean', 'etienne'), f('jean', 'cecile'),
  f('sandrine', 'etienne'), f('sandrine', 'cecile'),
  f('herve', 'joseph'), f('herve', 'rose'),
  f('carine', 'joseph'), f('carine', 'rose'),
  f('bruno', 'marguerite'), f('bruno', 'paul'),
  // gen3
  f('lucas', 'jean'), f('lucas', 'aurelie'),
  f('emma', 'jean'), f('emma', 'aurelie'),
  f('yannick', 'herve'), f('yannick', 'nadege'),
]

export const seedUnions: Union[] = [
  u('ondoua', 'akono', 1),
  u('ondoua', 'bella', 2),
  u('etienne', 'cecile'),
  u('joseph', 'rose'),
  u('marguerite', 'paul'),
  u('jean', 'aurelie'),
  u('herve', 'nadege'),
]

export const seedTributes: Tribute[] = [
  { id: 't1', personId: 'ondoua', kind: 'histoire', authorName: 'Marguerite Mballa', text: "Pa Ondoua réunissait toute la famille sous le manguier chaque dimanche. Il disait : « un arbre sans racines tombe au premier vent ».", createdAt: T(40) },
  { id: 't2', personId: 'ondoua', kind: 'temoignage', authorName: 'Joseph Mballa', text: "Mon père a marché 30 km pour m'inscrire à l'école. Je lui dois tout.", createdAt: T(20) },
  { id: 't3', personId: 'etienne', kind: 'histoire', authorName: 'Jean Mballa', text: "Papa corrigeait nos cahiers à la lampe tempête. Il n'a jamais laissé un enfant du village sans savoir lire.", createdAt: T(10) },
]

function f(childId: string, parentId: string): Filiation {
  return { id: `${childId}<${parentId}`, childId, parentId, status: 'confirmed' }
}
function u(aId: string, bId: string, rank?: number): Union {
  return { id: `${aId}~${bId}`, aId, bId, status: 'confirmed', rank }
}
function T(daysAgo: number): number {
  return 1_748_736_000_000 - daysAgo * 86_400_000
}
