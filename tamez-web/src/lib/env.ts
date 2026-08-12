/**
 * Lectura centralizada de variables de entorno.
 *
 * Las `NEXT_PUBLIC_*` se leen de forma estática (no por índice dinámico)
 * porque Next las sustituye en tiempo de compilación.
 *
 * Nada aquí lanza excepciones en tiempo de import: el sitio debe poder
 * construirse y desplegarse ANTES de que existan las claves de Supabase.
 * Las rutas que las necesitan comprueban `isSupabaseConfigured()`.
 */

/** URL pública del proyecto Supabase. */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/**
 * Clave publicable (antes "anon"). Se admiten ambos nombres: los proyectos
 * nuevos de Supabase entregan `sb_publishable_…`.
 */
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

/**
 * Clave secreta de servidor. NUNCA debe llevar el prefijo NEXT_PUBLIC_:
 * eso la expondría al navegador.
 */
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** Sal opcional para el hash de IP anti-spam. */
const LEAD_IP_SALT = process.env.LEAD_IP_SALT ?? '';

export const env = {
  supabaseUrl: SUPABASE_URL,
  supabasePublishableKey: SUPABASE_PUBLISHABLE_KEY,
  supabaseSecretKey: SUPABASE_SECRET_KEY,
  leadIpSalt: LEAD_IP_SALT,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

/** ¿Hay credenciales de servidor suficientes para escribir prospectos? */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseSecretKey);
}

/** ¿Hay credenciales públicas suficientes para leer desde el navegador? */
export function isSupabasePublicConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}
