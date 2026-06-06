import type { Person } from './types'

/** Taux de complétude d'un profil + liste des champs manquants. */
export function completeness(p: Person, parentCount: number): { pct: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [!!(p.photo || p.avatar), 'une photo'],
    [!!p.birthYear, 'ton année de naissance'],
    [!!p.profession, 'ta profession'],
    [!!(p.city || p.country), 'ton lieu de résidence'],
    [!!p.village, "ton village d'origine"],
    [!!p.clan, 'ton clan'],
    [!!p.lignage, 'ton lignage'],
    [!!p.phone, 'ton téléphone'],
    [!!p.bio, 'une courte biographie'],
    [parentCount > 0, 'tes parents'],
  ]
  const done = checks.filter(([ok]) => ok).length
  return { pct: Math.round((done / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, l]) => l) }
}
