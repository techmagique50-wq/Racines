/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** URL du projet Supabase (Project Settings → API → Project URL). */
  readonly VITE_SUPABASE_URL?: string
  /** Clé publique « anon » Supabase — protégée par les policies RLS, jamais la service_role. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
