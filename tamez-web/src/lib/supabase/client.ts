'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabasePublicConfigured } from '@/lib/env';
import type { Database } from './types';

/**
 * Cliente de navegador con la clave publicable.
 *
 * La primera versión NO lo necesita: el formulario escribe a través de
 * `/api/leads` para no exponer la tabla `leads` al público. Queda disponible
 * para funcionalidades futuras de sólo lectura (por ejemplo, una galería de
 * resultados administrada desde Supabase).
 *
 * Cualquier tabla que se consulte desde aquí DEBE tener RLS con una política
 * de lectura explícita.
 */

let cached: SupabaseClient<Database> | null = null;

export function getSupabaseBrowser(): SupabaseClient<Database> | null {
  if (!isSupabasePublicConfigured()) return null;
  if (cached) return cached;

  cached = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { persistSession: false },
  });

  return cached;
}
