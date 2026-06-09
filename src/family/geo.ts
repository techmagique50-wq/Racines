// ── Géographie de la diaspora ────────────────────────────────────────────────
// Table de coordonnées (lng, lat) des pays les plus fréquents + repli ville→pays
// pour les villes de référence. Projection équirectangulaire simple pour la carte.

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/** Coordonnées approximatives (centre du pays) pour positionner les bulles. */
const COUNTRY_COORD: Record<string, [number, number]> = {
  cameroun: [12.35, 5.48],
  france: [2.35, 47.0],
  canada: [-79.4, 45.5], // centré sur l'est francophone (Montréal)
  belgique: [4.47, 50.5],
  suisse: [8.23, 46.8],
  allemagne: [10.45, 51.2],
  'etats-unis': [-95.7, 38.0],
  'royaume-uni': [-1.5, 52.5],
  gabon: [11.6, -0.8],
  tchad: [18.7, 15.4],
  senegal: [-14.5, 14.5],
  cotedivoire: [-5.5, 7.5],
  "cote d'ivoire": [-5.5, 7.5],
  nigeria: [8.1, 9.1],
  congo: [15.3, -0.7],
  rdc: [23.6, -2.9],
  maroc: [-7.1, 31.8],
  italie: [12.5, 42.8],
  espagne: [-3.7, 40.4],
}

/** Villes de référence → pays (repli quand `country` n'est pas renseigné). */
const CITY_COUNTRY: Record<string, string> = {
  yaounde: 'Cameroun',
  douala: 'Cameroun',
  mbalmayo: 'Cameroun',
  sangmelima: 'Cameroun',
  bafoussam: 'Cameroun',
  garoua: 'Cameroun',
  bamenda: 'Cameroun',
  paris: 'France',
  lyon: 'France',
  marseille: 'France',
  montreal: 'Canada',
  bruxelles: 'Belgique',
  geneve: 'Suisse',
  londres: 'Royaume-Uni',
  libreville: 'Gabon',
}

export function coordOf(country?: string): [number, number] | null {
  if (!country) return null
  return COUNTRY_COORD[norm(country)] ?? null
}

/** Déduit le pays d'une personne à partir de `country`, sinon de sa ville. */
export function countryOf(country?: string, city?: string): string | null {
  if (country?.trim()) return country.trim()
  if (city?.trim()) return CITY_COUNTRY[norm(city)] ?? null
  return null
}

/** Projection équirectangulaire : (lng,lat) → coordonnées sur une carte W×H. */
export function project(lng: number, lat: number, width: number, height: number): [number, number] {
  return [((lng + 180) / 360) * width, ((90 - lat) / 180) * height]
}
