import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Configuración de Supabase. Se aceptan los nombres VITE_* y también los NEXT_PUBLIC_*
 * que ya existen en Netlify. Solo claves publicables: todo esto llega al navegador.
 */
const env = import.meta.env
const url: string | undefined = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const key: string | undefined =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** VITE_DEMO_ONLY=1 obliga el modo demostración (Netlify lo pone en los deploy previews). */
const demoOnly = env.VITE_DEMO_ONLY === '1' || env.VITE_DEMO_ONLY === 'true'

export const supabaseConfigured = Boolean(url && key) && !demoOnly

let client: SupabaseClient | null = null
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null
  client ??= createClient(url!, key!, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return client
}
