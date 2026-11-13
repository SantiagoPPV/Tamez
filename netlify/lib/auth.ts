/**
 * Solo un socio del despacho (sam_staff) usa las funciones del servidor. Se comprueba con
 * su propia sesión de Supabase: la base responde sam_is_staff() con sus permisos.
 */
import { env, HttpError } from './http.ts'

export interface Caller {
  token: string
  supabaseUrl: string
  apiKey: string
}

export function supabaseEnv() {
  const supabaseUrl = env('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')
  const apiKey = env(
    'SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  )
  return { supabaseUrl: supabaseUrl?.replace(/\/+$/, ''), apiKey }
}

export async function requireStaff(req: Request): Promise<Caller> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new HttpError(401, 'Falta la sesión: entra con tu usuario.', 'no_session')
  const { supabaseUrl, apiKey } = supabaseEnv()
  if (!supabaseUrl || !apiKey) throw new HttpError(500, 'Faltan la URL y la clave publicable de Supabase en Netlify.', 'not_configured')
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/sam_is_staff`, {
    method: 'POST',
    headers: { apikey: apiKey, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  })
  if (res.status === 401) throw new HttpError(401, 'La sesión venció: vuelve a entrar.', 'no_session')
  if (!res.ok) throw new HttpError(502, 'No se pudo comprobar el acceso con Supabase.')
  if ((await res.json()) !== true) throw new HttpError(403, 'Solo los socios del despacho usan esta función.', 'not_staff')
  return { token, supabaseUrl, apiKey }
}

/** Llamada a la base con la sesión de quien llama (la RLS sigue aplicando). */
export async function rest<T>(c: Caller, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${c.supabaseUrl}/rest/v1/${path}`, {
    method: init.method ?? 'GET',
    headers: { apikey: c.apiKey, authorization: `Bearer ${c.token}`, 'content-type': 'application/json', prefer: 'return=representation' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) throw new HttpError(res.status, `Supabase: ${await res.text()}`)
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}
