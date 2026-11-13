import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMime, emailProvider, mailFrom, validateMail } from './mail.ts'

const decode = (b64: string) => Buffer.from(b64.replace(/\r\n/g, ''), 'base64').toString('utf8')

describe('Correo del sistema', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('elige el proveedor configurado', () => {
    vi.stubEnv('GOOGLE_CLIENT_EMAIL', '')
    vi.stubEnv('GOOGLE_PRIVATE_KEY', '')
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', '')
    vi.stubEnv('RESEND_API_KEY', '')
    expect(emailProvider()).toBeNull()
    vi.stubEnv('RESEND_API_KEY', 're_prueba')
    expect(emailProvider()).toBe('resend')
    vi.stubEnv('GOOGLE_CLIENT_EMAIL', 'correo@proyecto.iam.gserviceaccount.com')
    vi.stubEnv('GOOGLE_PRIVATE_KEY', '-----BEGIN PRIVATE KEY-----\\nX\\n-----END PRIVATE KEY-----')
    vi.stubEnv('GOOGLE_SENDER', 'avisos@despacho.mx')
    expect(emailProvider()).toBe('google')
    vi.stubEnv('EMAIL_PROVIDER', 'resend')
    expect(emailProvider()).toBe('resend')
  })

  it('con Google manda como el usuario del dominio, con el nombre visible', () => {
    vi.stubEnv('GOOGLE_SENDER', 'avisos@despacho.mx')
    vi.stubEnv('EMAIL_FROM', 'Sistemas a la medida <otro@despacho.mx>')
    expect(mailFrom('google')).toBe('Sistemas a la medida <avisos@despacho.mx>')
    expect(mailFrom('resend')).toBe('Sistemas a la medida <otro@despacho.mx>')
  })

  it('revisa destinatarios, asunto y cuerpo', () => {
    expect(() => validateMail({ to: [], subject: 'x', html: '<p>x</p>' })).toThrow(/a quién/)
    expect(() => validateMail({ to: ['no-es-correo'], subject: 'x', html: '<p>x</p>' })).toThrow(/no válido/)
    expect(() => validateMail({ to: ['a@b.mx'], subject: '', html: '<p>x</p>' })).toThrow(/asunto/)
    const m = validateMail({ to: ['A@B.mx', 'a@b.mx', ' c@d.mx '], subject: 'Acta\r\nBcc: x@y.mx', html: '<p>x</p>' })
    expect(m.to).toEqual(['a@b.mx', 'c@d.mx'])
    expect(m.subject).toBe('Acta Bcc: x@y.mx')
  })

  it('arma un mensaje MIME con texto, HTML y adjuntos en UTF-8', () => {
    const mime = buildMime(
      { to: ['a@b.mx'], cc: ['c@d.mx'], subject: 'Acta de inicio firmada · CE-INV', html: '<p>Hola, aquí está el acta.</p>', attachments: [{ filename: 'acta.pdf', contentType: 'application/pdf', base64: Buffer.from('PDF').toString('base64') }] },
      'Sistemas a la medida <avisos@despacho.mx>',
      'frontera',
    )
    expect(mime).toContain('To: a@b.mx')
    expect(mime).toContain('Cc: c@d.mx')
    expect(mime).toMatch(/Subject: =\?UTF-8\?B\?.+\?=/)
    expect(decode(mime.match(/Subject: =\?UTF-8\?B\?(.+)\?=/)![1])).toBe('Acta de inicio firmada · CE-INV')
    expect(mime).toContain('multipart/mixed; boundary="mix-frontera"')
    expect(mime).toContain('filename="acta.pdf"')
    const html = mime.split('Content-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n')[1].split('\r\n--')[0]
    expect(decode(html)).toBe('<p>Hola, aquí está el acta.</p>')
    const text = mime.split('Content-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n')[1].split('\r\n--')[0]
    expect(decode(text)).toBe('Hola, aquí está el acta.')
  })
})
