import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from './factura.mts'

const fiscal = { rfc: 'CEJ150302AB4', legalName: 'Cliente Ejemplo', taxSystem: '601', zip: '06600', cfdiUse: 'G03', emails: 'facturas@clienteejemplo.mx', paymentMethod: 'PPD', paymentForm: '99' }
const billing = { series: 'A', productKey: '81111500', unitKey: 'E48', unitName: 'Unidad de servicio', paymentForm: '03', paymentMethod: 'PPD', cfdiUse: 'G03', taxRate: 0.16 }
const req = (body: unknown, token = 'token-de-socio') => new Request('https://x/.netlify/functions/factura', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('Función de timbrado (FacturAPI)', () => {
  const calls: { url: string; init?: RequestInit }[] = []
  beforeEach(() => {
    calls.length = 0
    vi.stubEnv('SUPABASE_URL', 'https://proyecto.supabase.co')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_x')
    vi.stubEnv('FACTURAPI_KEY', 'sk_test_x')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init })
        if (url.endsWith('/rpc/sam_is_staff')) return new Response(JSON.stringify((init?.headers as Record<string, string>).authorization === 'Bearer token-de-socio'))
        if (url === 'https://www.facturapi.io/v2/invoices' && init?.method === 'POST')
          return new Response(JSON.stringify({ id: 'fapi_1', uuid: 'abc-uuid', status: 'valid', total: 46400, date: '2027-01-07T10:00:00Z', series: 'A', folio_number: 15 }))
        if (url.endsWith('/pdf')) return new Response(new TextEncoder().encode('%PDF'))
        if (url.endsWith('/xml')) return new Response(new TextEncoder().encode('<cfdi/>'))
        return new Response('{}', { status: 404 })
      }),
    )
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('solo un socio la usa', async () => {
    const res = await handler(req({ action: 'descargar', facturapiId: 'fapi_1' }, 'token-de-cliente'))
    expect(res.status).toBe(403)
  })

  it('timbra la factura y devuelve el PDF y el XML', async () => {
    const res = await handler(req({ action: 'timbrar', invoice: { id: 'inv-1', description: 'Pago inicial', amount: 40000 }, fiscal, billing, projectKey: 'CE-INV' }))
    expect(res.status).toBe(200)
    const j = (await res.json()) as { cfdi: unknown; pdf: string }
    expect(j.cfdi).toEqual({ facturapiId: 'fapi_1', uuid: 'ABC-UUID', series: 'A', folio: '15', issuedAt: '2027-01-07T10:00:00Z', total: 46400, status: 'valid' })
    expect(Buffer.from(j.pdf, 'base64').toString()).toBe('%PDF')
    const sent = calls.find((c) => c.url === 'https://www.facturapi.io/v2/invoices')!
    expect((sent.init?.headers as Record<string, string>).authorization).toBe('Bearer sk_test_x')
    expect(JSON.parse(String(sent.init?.body))).toMatchObject({ payment_method: 'PPD', payment_form: '99', items: [{ product: { tax_included: false, price: 40000 } }] })
  })

  it('no timbra sin los datos para facturar', async () => {
    const res = await handler(req({ action: 'timbrar', invoice: { id: 'inv-1', description: 'x', amount: 40000 }, fiscal: { ...fiscal, rfc: '' }, billing }))
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toMatch(/RFC/)
    expect(calls.some((c) => c.url.includes('facturapi'))).toBe(false)
  })

  it('sin clave de FacturAPI dice que no está configurado', async () => {
    vi.stubEnv('FACTURAPI_KEY', '')
    const res = await handler(req({ action: 'descargar', facturapiId: 'fapi_1' }))
    expect(res.status).toBe(501)
    expect(((await res.json()) as { code: string }).code).toBe('not_configured')
  })
})
