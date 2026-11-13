/** Llamadas a FacturAPI con la clave secreta del despacho (FACTURAPI_KEY, solo en el servidor). */
import { env, HttpError } from './http.ts'

const BASE = 'https://www.facturapi.io/v2'

export function facturapiMode(): 'test' | 'live' | null {
  const key = env('FACTURAPI_KEY')
  if (!key) return null
  return key.startsWith('sk_live') ? 'live' : 'test'
}

function key(): string {
  const k = env('FACTURAPI_KEY')
  if (!k) throw new HttpError(501, 'El timbrado no está configurado: falta FACTURAPI_KEY en Netlify.', 'not_configured')
  return k
}

async function errorOf(res: Response): Promise<HttpError> {
  let message = `${res.status}`
  let code = 'facturapi'
  try {
    const j = (await res.json()) as { message?: string; code?: string }
    message = j.message ?? message
    code = j.code ?? code
  } catch {
    /* sin cuerpo */
  }
  if (res.status === 409 && code === 'idempotency_key_in_use')
    return new HttpError(409, 'Esta factura ya se mandó a timbrar antes. Revísala en el panel de FacturAPI antes de repetir.', code)
  return new HttpError(res.status >= 500 ? 502 : 400, `FacturAPI: ${message}`, code)
}

export async function fapi<T>(path: string, init: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  const qs = init.query ? `?${new URLSearchParams(init.query)}` : ''
  const res = await fetch(`${BASE}${path}${qs}`, {
    method: init.method ?? 'GET',
    headers: { authorization: `Bearer ${key()}`, 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) throw await errorOf(res)
  return (await res.json()) as T
}

/** PDF o XML de una factura, en base64. */
export async function fapiFile(id: string, kind: 'pdf' | 'xml'): Promise<string> {
  const res = await fetch(`${BASE}/invoices/${encodeURIComponent(id)}/${kind}`, { headers: { authorization: `Bearer ${key()}` } })
  if (!res.ok) throw await errorOf(res)
  return Buffer.from(await res.arrayBuffer()).toString('base64')
}

export interface FapiInvoice {
  id: string
  uuid?: string | null
  status: string
  total: number
  date?: string | null
  series?: string
  folio_number?: number
  payment_method?: string | null
  payment_form?: string | null
  cancellation_status?: string
}
