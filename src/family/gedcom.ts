// ── Export GEDCOM 5.5.1 ──────────────────────────────────────────────────────
// Convertit l'arbre RACINES (personnes + filiations + unions) au format GEDCOM,
// lisible par tous les logiciels de généalogie (Gramps, Ancestry, MyHeritage…).

import type { Filiation, Person, Union } from './types'

const tag = (level: number, t: string, val?: string) =>
  val == null || val === '' ? `${level} ${t}` : `${level} ${t} ${val}`

/** Découpe une valeur multiligne en lignes CONT (GEDCOM n'aime pas les \n bruts). */
function multiline(level: number, t: string, val: string): string[] {
  const lines = val.split(/\r?\n/)
  return lines.map((l, i) => (i === 0 ? tag(level, t, l) : tag(level + 1, 'CONT', l)))
}

interface Fam {
  parents: string[]
  children: string[]
}

/**
 * Regroupe les personnes en familles GEDCOM (un couple + ses enfants).
 * Les enfants à parent unique sont rattachés au couple connu de ce parent
 * quand il est unique, sinon à une famille mono-parentale.
 */
function buildFamilies(filiations: Filiation[], unions: Union[]) {
  const families = new Map<string, Fam>()
  const ensure = (parents: string[]): string => {
    const key = [...new Set(parents)].sort().join('+')
    if (!families.has(key)) families.set(key, { parents: [...new Set(parents)].sort(), children: [] })
    return key
  }

  // 1. Couples (pour que les conjoints sans enfants apparaissent quand même).
  for (const u of unions) ensure([u.aId, u.bId])

  // parent -> clés de couples auxquels il appartient
  const couplesByParent = new Map<string, string[]>()
  for (const [key, fam] of families)
    for (const p of fam.parents) {
      const arr = couplesByParent.get(p) ?? []
      arr.push(key)
      couplesByParent.set(p, arr)
    }

  // 2. Enfants
  const parentsOfChild = new Map<string, string[]>()
  for (const f of filiations) {
    const arr = parentsOfChild.get(f.childId) ?? []
    arr.push(f.parentId)
    parentsOfChild.set(f.childId, arr)
  }
  for (const [childId, pids] of parentsOfChild) {
    const uniq = [...new Set(pids)]
    let key: string
    if (uniq.length >= 2) key = ensure(uniq)
    else {
      const couples = couplesByParent.get(uniq[0]) ?? []
      key = couples.length === 1 ? couples[0] : ensure(uniq)
    }
    families.get(key)!.children.push(childId)
  }

  return families
}

export function toGedcom(persons: Person[], filiations: Filiation[], unions: Union[]): string {
  const indiId = new Map(persons.map((p, i) => [p.id, `@I${i + 1}@`]))
  const families = buildFamilies(filiations, unions)
  const famKeys = [...families.keys()]
  const famId = new Map(famKeys.map((k, i) => [k, `@F${i + 1}@`]))

  // index par personne : familles comme parent (FAMS) / comme enfant (FAMC)
  const fams = new Map<string, string[]>()
  const famc = new Map<string, string[]>()
  for (const [key, fam] of families) {
    const fid = famId.get(key)!
    for (const p of fam.parents) (fams.get(p) ?? fams.set(p, []).get(p)!).push(fid)
    for (const c of fam.children) (famc.get(c) ?? famc.set(c, []).get(c)!).push(fid)
  }

  const out: string[] = []
  out.push(tag(0, 'HEAD'))
  out.push(tag(1, 'SOUR', 'RACINES'))
  out.push(tag(2, 'NAME', 'RACINES — la mémoire des familles'))
  out.push(tag(1, 'GEDC'))
  out.push(tag(2, 'VERS', '5.5.1'))
  out.push(tag(2, 'FORM', 'LINEAGE-LINKED'))
  out.push(tag(1, 'CHAR', 'UTF-8'))

  for (const p of persons) {
    out.push(tag(0, `${indiId.get(p.id)!} INDI`))
    const nick = p.nickname ? ` "${p.nickname}"` : ''
    out.push(tag(1, 'NAME', `${p.firstName}${nick} /${p.lastName}/`.trim()))
    out.push(tag(1, 'SEX', p.gender))
    if (p.birthYear) {
      out.push(tag(1, 'BIRT'))
      out.push(tag(2, 'DATE', String(p.birthYear)))
      if (p.village) out.push(tag(2, 'PLAC', p.village))
    }
    if (p.state === 'memoire' || p.deathYear) {
      out.push(tag(1, 'DEAT'))
      if (p.deathYear) out.push(tag(2, 'DATE', String(p.deathYear)))
    }
    if (p.profession) out.push(tag(1, 'OCCU', p.profession))
    if (p.city || p.country) {
      out.push(tag(1, 'RESI'))
      out.push(tag(2, 'PLAC', [p.city, p.country].filter(Boolean).join(', ')))
    }
    if (p.phone) out.push(tag(1, 'PHON', p.phone))
    // clan / lignage : champs non standard, conservés en notes typées.
    if (p.clan) out.push(tag(1, '_CLAN', p.clan))
    if (p.lignage) out.push(tag(1, '_LIGN', p.lignage))
    if (p.bio) out.push(...multiline(1, 'NOTE', p.bio))
    for (const fid of famc.get(p.id) ?? []) out.push(tag(1, 'FAMC', fid))
    for (const fid of fams.get(p.id) ?? []) out.push(tag(1, 'FAMS', fid))
  }

  for (const [key, fam] of families) {
    out.push(tag(0, `${famId.get(key)!} FAM`))
    // HUSB = homme du couple, WIFE = femme (sinon premier/second parent)
    const males = fam.parents.filter((id) => persons.find((p) => p.id === id)?.gender === 'M')
    const females = fam.parents.filter((id) => persons.find((p) => p.id === id)?.gender === 'F')
    for (const m of males) out.push(tag(1, 'HUSB', indiId.get(m)!))
    for (const f of females) out.push(tag(1, 'WIFE', indiId.get(f)!))
    for (const c of fam.children) out.push(tag(1, 'CHIL', indiId.get(c)!))
  }

  out.push(tag(0, 'TRLR'))
  return out.join('\n')
}

/** Déclenche le téléchargement d'un fichier .ged dans le navigateur. */
export function downloadGedcom(persons: Person[], filiations: Filiation[], unions: Union[], familyName = 'racines') {
  const content = toGedcom(persons, filiations, unions)
  const blob = new Blob([content], { type: 'text/vnd.familysearch.gedcom;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = familyName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'racines'
  a.href = url
  a.download = `${slug}.ged`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
