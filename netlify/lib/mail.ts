/**
 * Correo saliente del sistema. Dos proveedores, el mismo mensaje:
 * - Google Workspace (cuenta de empresa): una cuenta de servicio con delegación de todo el
 *   dominio manda como el usuario GOOGLE_SENDER por la API de Gmail. Requiere que el
 *   administrador de Google autorice el permiso gmail.send para esa cuenta de servicio.
 * - Resend: clave RESEND_API_KEY y un dominio verificado en Resend.
 * EMAIL_PROVIDER elige uno («google» o «resend»); sin él, se usa el que esté configurado.
 */
import { createSign, randomBytes } from 'node:crypto'
import { env, HttpError } from './http.ts'

export interface Attachment {
  filename: string
  contentType: string
  /** Contenido en base64 */
  base64: string
}

export interface Mail {
  to: string[]
  cc?: string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: Attachment[]
}

export type Provider = 'google' | 'resend'

const EMAIL = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/

function googleCreds(): { clientEmail: string; privateKey: string } | null {
  const raw = env('GOOGLE_SERVICE_ACCOUNT_JSON')
  if (raw) {
    try {
      const j = JSON.parse(raw) as { client_email?: string; private_key?: string }
      if (j.client_email && j.private_key) return { clientEmail: j.client_email, privateKey: j.private_key }
    } catch {
      /* se intenta con las variables sueltas */
    }
  }
  const clientEmail = env('GOOGLE_CLIENT_EMAIL')
  const privateKey = env('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n')
  return clientEmail && privateKey ? { clientEmail, privateKey } : null
}

export function emailProvider(): Provider | null {
  const wanted = env('EMAIL_PROVIDER')?.toLowerCase()
  const google = Boolean(googleCreds() && env('GOOGLE_SENDER'))
  const resend = Boolean(env('RESEND_API_KEY'))
  if (wanted === 'google') return google ? 'google' : null
  if (wanted === 'resend') return resend ? 'resend' : null
  return google ? 'google' : resend ? 'resend' : null
}

/** Remitente: EMAIL_FROM («Nombre <correo>») o, con Google, el usuario que manda. */
export function mailFrom(provider: Provider): string {
  const from = env('EMAIL_FROM')
  if (provider === 'google') {
    const sender = env('GOOGLE_SENDER')!
    if (!from) return sender
    // Gmail solo deja mandar como el usuario (o sus alias): se respeta el nombre visible.
    const name = from.match(/^(.*)<[^>]+>\s*$/)?.[1]?.trim().replace(/^"|"$/g, '')
    return name ? `${name} <${sender}>` : sender
  }
  if (!from) throw new HttpError(500, 'Falta EMAIL_FROM en Netlify (por ejemplo: Sistemas a la medida <avisos@su-dominio.mx>).', 'not_configured')
  return from
}

export function validateMail(m: Mail): Mail {
  const clean = (xs: string[] | undefined) => [...new Set((xs ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean))]
  const to = clean(m.to)
  const cc = clean(m.cc)
  const bad = [...to, ...cc].filter((x) => !EMAIL.test(x))
  if (!to.length) throw new HttpError(400, 'Falta a quién mandarlo.')
  if (bad.length) throw new HttpError(400, `Correo no válido: ${bad.join(', ')}`)
  if (to.length + cc.length > 30) throw new HttpError(400, 'Máximo 30 destinatarios por correo.')
  const subject = (m.subject ?? '').replace(/[\r\n]+/g, ' ').trim()
  if (!subject || subject.length > 200) throw new HttpError(400, 'El asunto va de 1 a 200 caracteres.')
  if (!m.html || m.html.length > 500_000) throw new HttpError(400, 'El cuerpo del correo está vacío o es demasiado grande.')
  if (m.replyTo && !EMAIL.test(m.replyTo.trim())) throw new HttpError(400, 'El correo de respuesta no es válido.')
  const attachments = (m.attachments ?? []).slice(0, 5)
  if (attachments.reduce((n, a) => n + a.base64.length, 0) > 7_000_000) throw new HttpError(400, 'Los adjuntos pasan de 5 MB.')
  return { ...m, to, cc, subject, attachments, replyTo: m.replyTo?.trim() || undefined }
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64')
const b64url = (s: string | Buffer) => b64(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const encodeWord = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`)
const wrap76 = (s: string) => s.replace(/(.{76})/g, '$1\r\n')
const htmlToText = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** Mensaje RFC 5322 (texto y HTML, con adjuntos) para la API de Gmail. */
export function buildMime(m: Mail, from: string, boundary = randomBytes(12).toString('hex')): string {
  const alt = `alt-${boundary}`
  const mixed = `mix-${boundary}`
  const headers = [
    `From: ${from.replace(/^([^<]*)</, (_x, name: string) => `${encodeWord(name.trim())} <`)}`,
    `To: ${m.to.join(', ')}`,
    ...(m.cc?.length ? [`Cc: ${m.cc.join(', ')}`] : []),
    ...(m.replyTo ? [`Reply-To: ${m.replyTo}`] : []),
    `Subject: ${encodeWord(m.subject)}`,
    'MIME-Version: 1.0',
  ]
  const body = [
    `--${alt}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(m.text ?? htmlToText(m.html))),
    `--${alt}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(m.html)),
    `--${alt}--`,
  ]
  if (!m.attachments?.length) return [...headers, `Content-Type: multipart/alternative; boundary="${alt}"`, '', ...body, ''].join('\r\n')
  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    '',
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    '',
    ...body,
    ...m.attachments.flatMap((a) => [
      `--${mixed}`,
      `Content-Type: ${a.contentType}; name="${encodeWord(a.filename)}"`,
      `Content-Disposition: attachment; filename="${encodeWord(a.filename)}"`,
      'Content-Transfer-Encoding: base64',
      '',
      wrap76(a.base64),
    ]),
    `--${mixed}--`,
    '',
  ].join('\r\n')
}

/** Token de acceso de la cuenta de servicio, a nombre del usuario que manda (delegación del dominio). */
export async function googleAccessToken(sender: string): Promise<string> {
  const creds = googleCreds()
  if (!creds) throw new HttpError(500, 'Faltan las credenciales de la cuenta de servicio de Google.', 'not_configured')
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({ iss: creds.clientEmail, sub: sender, scope: 'https://www.googleapis.com/auth/gmail.send', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }),
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const jwt = `${header}.${claims}.${b64url(signer.sign(creds.privateKey))}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const j = (await res.json()) as { access_token?: string; error?: string; error_description?: string }
  if (!res.ok || !j.access_token)
    throw new HttpError(
      502,
      `Google no autorizó el envío (${j.error ?? res.status}). Revisa que el administrador de Google haya dado a la cuenta de servicio el permiso gmail.send con delegación de todo el dominio.`,
    )
  return j.access_token
}

async function sendGoogle(m: Mail, from: string): Promise<string> {
  const sender = env('GOOGLE_SENDER')!
  const token = await googleAccessToken(sender)
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ raw: b64url(buildMime(m, from)) }),
  })
  const j = (await res.json()) as { id?: string; error?: { message?: string } }
  if (!res.ok) throw new HttpError(502, `Gmail no envió el correo: ${j.error?.message ?? res.status}`)
  return j.id ?? ''
}

async function sendResend(m: Mail, from: string): Promise<string> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: m.to,
      cc: m.cc?.length ? m.cc : undefined,
      reply_to: m.replyTo,
      subject: m.subject,
      html: m.html,
      text: m.text ?? htmlToText(m.html),
      attachments: m.attachments?.map((a) => ({ filename: a.filename, content: a.base64, content_type: a.contentType })),
    }),
  })
  const j = (await res.json()) as { id?: string; message?: string }
  if (!res.ok) throw new HttpError(502, `Resend no envió el correo: ${j.message ?? res.status}`)
  return j.id ?? ''
}

export async function sendMail(input: Mail): Promise<{ provider: Provider; id: string }> {
  const provider = emailProvider()
  if (!provider) throw new HttpError(501, 'El correo del sistema no está configurado.', 'not_configured')
  const m = validateMail(input)
  const from = mailFrom(provider)
  const id = provider === 'google' ? await sendGoogle(m, from) : await sendResend(m, from)
  return { provider, id }
}
