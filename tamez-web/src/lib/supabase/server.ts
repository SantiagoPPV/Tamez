import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/lib/env';
import type { Database } from './types';

/**
 * Cliente de servidor con la clave secreta.
 *
 * Se usa EXCLUSIVAMENTE en Route Handlers. El import de `server-only` hace
 * fallar la compilación si alguien lo importa desde un componente cliente,
 * de modo que la clave nunca puede filtrarse al navegador.
 */

let cached: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;

  cached = createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { 'x-application-name': 'tamez-web' },
    },
  });

  return cached;
}
