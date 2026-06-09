// ── Authentification réelle (Supabase) ───────────────────────────────────────
// Inscription/connexion via Supabase Auth + onboarding atomique côté serveur
// (RPC create_family_with_member). Toutes les écritures passent par la RLS.

import { supabase } from './supabase'
import type { Gender } from '../family/types'

export interface SignUpInput {
  email: string
  password: string
  familyName: string
  firstName: string
  lastName: string
  gender: Gender
  clan?: string
  lignage?: string
}

export interface MyFamily {
  familyId: string
  familyName: string
  clan: string | null
  role: string
  me: { id: string; firstName: string; lastName: string } | null
  personCount: number
}

function need() {
  if (!supabase) throw new Error('Backend non configuré (renseigne .env.local).')
  return supabase
}

/** Inscription + création de la famille de l'utilisateur (il en devient gardien). */
export async function signUpAndOnboard(i: SignUpInput): Promise<{ needsConfirmation: boolean }> {
  const sb = need()
  const { data, error } = await sb.auth.signUp({ email: i.email.trim().toLowerCase(), password: i.password })
  if (error) throw error
  // « Confirm email » activé : pas de session tant que l'email n'est pas confirmé.
  if (!data.session) return { needsConfirmation: true }

  const { error: e2 } = await sb.rpc('create_family_with_member', {
    p_family_name: i.familyName.trim(),
    p_clan: i.clan?.trim() ?? '',
    p_lignage: i.lignage?.trim() ?? '',
    p_first_name: i.firstName.trim(),
    p_last_name: i.lastName.trim(),
    p_gender: i.gender,
  })
  if (e2) throw e2
  return { needsConfirmation: false }
}

export async function signIn(email: string, password: string): Promise<void> {
  const sb = need()
  const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  await need().auth.signOut()
}

/** Charge la famille de l'utilisateur connecté (lecture sous RLS). */
export async function loadMyFamily(): Promise<MyFamily | null> {
  const sb = need()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return null

  const { data: mem } = await sb.from('family_members').select('family_id, role, person_id').limit(1).maybeSingle()
  if (!mem) return null

  const { data: fam } = await sb.from('families').select('name, clan').eq('id', mem.family_id).single()

  let me: MyFamily['me'] = null
  if (mem.person_id) {
    const { data: p } = await sb.from('persons').select('id, first_name, last_name').eq('id', mem.person_id).single()
    if (p) me = { id: p.id, firstName: p.first_name, lastName: p.last_name }
  }

  const { count } = await sb.from('persons').select('id', { count: 'exact', head: true }).eq('family_id', mem.family_id)

  return {
    familyId: mem.family_id,
    familyName: fam?.name ?? '',
    clan: fam?.clan ?? null,
    role: mem.role,
    me,
    personCount: count ?? 0,
  }
}

/** Ajoute une fiche dans MA famille (écriture authentifiée, validée par la RLS). */
export async function addPersonToMyFamily(
  familyId: string,
  p: { firstName: string; lastName: string; gender: Gender },
): Promise<void> {
  const sb = need()
  const { error } = await sb.from('persons').insert({
    family_id: familyId,
    first_name: p.firstName.trim(),
    last_name: p.lastName.trim(),
    gender: p.gender,
    state: 'vivant',
  })
  if (error) throw error
}

/** Liste les fiches de MA famille (lecture sous RLS). */
export async function listMyPersons(familyId: string) {
  const sb = need()
  const { data } = await sb.from('persons').select('id, first_name, last_name, gender, role').eq('family_id', familyId).order('created_at')
  return data ?? []
}
