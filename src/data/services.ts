/**
 * Funciones del servidor (Netlify) desde la pantalla: correo, resumen con IA, timbrado y
 * estado de las integraciones. En la demostración, o si algo no está configurado, cada
 * función dice qué falta y el correo se abre listo en el programa de correo del usuario.
 */
import type { BillingSettings, FiscalData } from '../domain/types'
import type { InvoiceToStamp, PaymentToStamp } from '../domain/cfdi'
import { DataError, type Repository } from './repository'

export class ServiceError extends DataError {
  constructor(
    message: string,
    readonly service: string,
    readonly reason: 'not_configured' | 'demo' | 'no_session' | 'error' = 'error',
  ) {
    super(message)
  }
}

export interface Integrations {
  email: 'google' | 'resend' | null
  emailFrom: string | null
  ai: boolean
  /** Sin clave propia: por el AI Gateway de Netlify, cobrado en créditos de Netlify. */
  aiGateway?: boolean
  facturapi: 'test' | 'live' | null
}

const NONE: Integrations = { email: null, emailFrom: null, ai: false, facturapi: null }

async function call<T>(repo: Repository, name: string, body?: unknown): Promise<T> {
  if (repo.mode === 'demo') throw new ServiceError('En la demostración no hay servidor: esto funciona con la base de datos conectada.', name, 'demo')
  const token = await repo.accessToken()
  if (!token) throw new ServiceError('Falta la sesión: vuelve a entrar.', name, 'no_session')
  let res: Response
  try {
    res = await fetch(`/.netlify/functions/${name}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ServiceError('No hubo conexión con el servidor.', name)
  }
  if (res.status === 202) return undefined as T
  const text = await res.text()
  let j: { error?: string; code?: string } & Record<string, unknown> = {}
  try {
    j = text ? JSON.parse(text) : {}
  } catch {
    // Sin funciones (por ejemplo, `vite dev`): la ruta devuelve la página.
    throw new ServiceError('Las funciones del servidor no están disponibles en este ambiente.', name, 'not_configured')
  }
  if (!res.ok) throw new ServiceError(j.error ?? `Error ${res.status}`, name, j.code === 'not_configured' ? 'not_configured' : j.code === 'no_session' ? 'no_session' : 'error')
  return j as T
}

let cached: { at: number; value: Integrations } | null = null

/** Qué integraciones están listas (se pregunta una vez por minuto). */
export async function integrations(repo: Repository): Promise<Integrations> {
  if (repo.mode === 'demo') return NONE
  if (cached && Date.now() - cached.at < 60_000) return cached.value
  try {
    const value = await call<Integrations>(repo, 'integraciones')
    cached = { at: Date.now(), value }
    return value
  } catch {
    return NONE
  }
}

/* ------------------------------------------------------------- correo ---- */
export interface OutgoingMail {
  to: string[]
  cc?: string[]
  subject: string
  html: string
  text: string
  replyTo?: string
}

export function mailtoHref(m: Pick<OutgoingMail, 'to' | 'cc' | 'subject' | 'text'>): string {
  const q = new URLSearchParams()
  if (m.cc?.length) q.set('cc', m.cc.join(','))
  q.set('subject', m.subject)
  q.set('body', m.text.slice(0, 1800))
  return `mailto:${m.to.map(encodeURIComponent).join(',')}?${q.toString().replace(/\+/g, '%20')}`
}

/**
 * Manda el correo por el servidor si está configurado; si no, abre el programa de correo
 * con todo listo. Devuelve cómo se mandó.
 */
export async function sendMail(repo: Repository, m: OutgoingMail): Promise<{ via: 'server' | 'mailto'; provider?: string }> {
  const ready = await integrations(repo)
  if (ready.email) {
    const r = await call<{ provider: string }>(repo, 'correo', m)
    return { via: 'server', provider: r.provider }
  }
  window.location.href = mailtoHref(m)
  return { via: 'mailto' }
}

/** Texto plano a un HTML sencillo y seguro para el correo. */
export function mailHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const linked = esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
  return `<div style="font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.55;color:#0F172A">${linked
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')}</div>`
}

/* ------------------------------------------------------------- IA ---- */
export async function startDiscoverySummary(repo: Repository, jobId: string): Promise<void> {
  await call<void>(repo, 'resumen-background', { jobId })
}

/* ------------------------------------------------------------- CFDI ---- */
export interface StampResult {
  cfdi: { facturapiId: string; uuid: string; series: string; folio: string; issuedAt: string; total: number; status: string }
  pdf: string
  xml: string
}

export const stampInvoice = (repo: Repository, body: { invoice: InvoiceToStamp; fiscal: FiscalData; billing: BillingSettings; projectKey: string }) =>
  call<StampResult>(repo, 'factura', { action: 'timbrar', ...body })

export const stampPayment = (repo: Repository, body: { payment: PaymentToStamp; fiscal: FiscalData; billing: BillingSettings }) =>
  call<StampResult>(repo, 'factura', { action: 'complemento', ...body })

export const cancelCfdi = (repo: Repository, facturapiId: string, motive: '01' | '02' | '03' | '04', substitution?: string) =>
  call<{ status: string; cancellationStatus: string }>(repo, 'factura', { action: 'cancelar', facturapiId, motive, substitution })

export const emailCfdi = (repo: Repository, facturapiId: string, emails: string[]) => call<{ ok: boolean }>(repo, 'factura', { action: 'enviar', facturapiId, emails })

/** base64 a archivo, para guardarlo en el expediente. */
export function base64File(b64: string, name: string, type: string): File {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], name, { type })
}
