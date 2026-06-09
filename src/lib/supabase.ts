import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Client Supabase ──────────────────────────────────────────────────────────
// La clé « anon » est publique par conception : la sécurité repose sur les
// policies RLS de la base (voir supabase/migrations). NE JAMAIS exposer la
// service_role key côté client.

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** Vrai quand le backend est branché ; sinon l'app tourne en mode démo local. */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[RACINES] Supabase non configuré — mode démo local (localStorage). ' +
      'Renseigne .env.local (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY) pour activer le backend sécurisé.',
  )
}
