/**
 * Timbrado con FacturAPI: factura de ingreso, complemento de pago (facturas PPD),
 * cancelación, envío por correo y descarga de PDF y XML. La clave vive solo aquí.
 */
import { requireStaff } from '../lib/auth.ts'
import { fapi, fapiFile, type FapiInvoice } from '../lib/facturapi.ts'
import { handle, HttpError, json, readJson } from '../lib/http.ts'
import { fiscalMissing, invoicePayload, paymentPayload, type InvoiceToStamp, type PaymentToStamp } from '../../src/domain/cfdi.ts'
import type { BillingSettings, FiscalData } from '../../src/domain/types.ts'

type Body =
  | { action: 'timbrar'; invoice: InvoiceToStamp; fiscal: FiscalData; billing: BillingSettings; projectKey?: string }
  | { action: 'complemento'; payment: PaymentToStamp; fiscal: FiscalData; billing: BillingSettings }
  | { action: 'cancelar'; facturapiId: string; motive: '01' | '02' | '03' | '04'; substitution?: string }
  | { action: 'enviar'; facturapiId: string; emails: string[] }
  | { action: 'descargar'; facturapiId: string }

const summary = (inv: FapiInvoice) => ({
  facturapiId: inv.id,
  uuid: (inv.uuid ?? '').toUpperCase(),
  series: inv.series ?? '',
  folio: inv.folio_number != null ? String(inv.folio_number) : '',
  issuedAt: inv.date ?? '',
  total: inv.total,
  status: inv.status,
})

async function withFiles(inv: FapiInvoice) {
  const [pdf, xml] = await Promise.all([fapiFile(inv.id, 'pdf'), fapiFile(inv.id, 'xml')])
  return { cfdi: summary(inv), pdf, xml }
}

function checkFiscal(f: FiscalData | undefined) {
  const missing = fiscalMissing(f)
  if (missing.length) throw new HttpError(400, `Faltan datos para facturar: ${missing.join(', ')}.`, 'fiscal')
}

const ID = /^[A-Za-z0-9_-]{6,64}$/

export default async (req: Request) =>
  handle(async () => {
    await requireStaff(req)
    const body = await readJson<Body>(req)
    switch (body.action) {
      case 'timbrar': {
        checkFiscal(body.fiscal)
        if (!(body.invoice?.amount > 0)) throw new HttpError(400, 'La factura no tiene monto.')
        const inv = await fapi<FapiInvoice>('/invoices', { method: 'POST', body: invoicePayload(body.invoice, body.fiscal, body.billing, body.projectKey ?? '') })
        if (inv.status !== 'valid') throw new HttpError(502, `FacturAPI dejó la factura en estado «${inv.status}».`)
        return json(200, await withFiles(inv))
      }
      case 'complemento': {
        checkFiscal(body.fiscal)
        if (!body.payment?.uuid) throw new HttpError(400, 'Falta el folio fiscal (UUID) de la factura pagada.')
        const inv = await fapi<FapiInvoice>('/invoices', { method: 'POST', body: paymentPayload(body.payment, body.fiscal, body.billing) })
        return json(200, await withFiles(inv))
      }
      case 'cancelar': {
        if (!ID.test(body.facturapiId ?? '')) throw new HttpError(400, 'Factura no válida.')
        if (!['01', '02', '03', '04'].includes(body.motive)) throw new HttpError(400, 'Elige el motivo de cancelación.')
        if ((body.motive === '01' || body.motive === '04') && !body.substitution) throw new HttpError(400, 'Con el motivo 01 o 04 se indica la factura que la sustituye.')
        const query: Record<string, string> = { motive: body.motive }
        if (body.substitution) query.substitution = body.substitution
        const inv = await fapi<FapiInvoice>(`/invoices/${encodeURIComponent(body.facturapiId)}`, { method: 'DELETE', query })
        return json(200, { status: inv.status, cancellationStatus: inv.cancellation_status ?? '' })
      }
      case 'enviar': {
        if (!ID.test(body.facturapiId ?? '')) throw new HttpError(400, 'Factura no válida.')
        const emails = (body.emails ?? []).map((x) => x.trim()).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)).slice(0, 10)
        if (!emails.length) throw new HttpError(400, 'Falta el correo para enviar la factura.')
        await fapi(`/invoices/${encodeURIComponent(body.facturapiId)}/email`, { method: 'POST', body: { email: emails } })
        return json(200, { ok: true })
      }
      case 'descargar': {
        if (!ID.test(body.facturapiId ?? '')) throw new HttpError(400, 'Factura no válida.')
        const [pdf, xml] = await Promise.all([fapiFile(body.facturapiId, 'pdf'), fapiFile(body.facturapiId, 'xml')])
        return json(200, { pdf, xml })
      }
      default:
        throw new HttpError(400, 'Acción desconocida.')
    }
  })
