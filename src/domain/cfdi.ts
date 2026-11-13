/**
 * CFDI 4.0 con FacturAPI: lo que se manda a timbrar (ingreso y complemento de pago) y la
 * lectura del XML de una factura hecha fuera. Sin dependencias del navegador: lo usan la
 * pantalla y la función del servidor. Los montos del software van sin IVA.
 */
import { DEFAULT_BILLING } from './catalogs'
import type { BillingSettings, FiscalData } from './types'

const cents = (x: number) => Math.round(x * 100) / 100

export function totals(amount: number, taxRate = DEFAULT_BILLING.taxRate) {
  const subtotal = cents(amount)
  const tax = cents(subtotal * taxRate)
  return { subtotal, tax, total: cents(subtotal + tax) }
}

/** En CFDI 4.0 la razón social va sin el régimen societario («S.A. de C.V.»). */
export function stripRegimen(name: string): string {
  return name
    .replace(/[,\s]+(S\.?\s?A\.?\s?P\.?\s?I\.?\s?(de\s?C\.?\s?V\.?)?|S\.?\s?A\.?\s?B\.?\s?(de\s?C\.?\s?V\.?)?|S\.?\s?A\.?\s?S\.?|S\.?\s?A\.?\s?(de\s?C\.?\s?V\.?)?|S\.?\s?de\s?R\.?\s?L\.?\s?(de\s?C\.?\s?V\.?)?|S\.?\s?C\.?|A\.?\s?C\.?)\s*$/i, '')
    .trim()
}

const RFC = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/

export function fiscalMissing(f: FiscalData | null | undefined): string[] {
  const out: string[] = []
  if (!f?.rfc || !RFC.test(f.rfc.trim().toUpperCase())) out.push('RFC válido (12 o 13 caracteres)')
  if (!f?.legalName?.trim()) out.push('Razón social')
  if (!f?.taxSystem) out.push('Régimen fiscal')
  if (!f?.zip || !/^\d{5}$/.test(f.zip.trim())) out.push('Código postal fiscal (5 dígitos)')
  if (!f?.cfdiUse) out.push('Uso del CFDI')
  return out
}

export interface InvoiceToStamp {
  id: string
  description: string
  amount: number
}

/** Cuerpo de POST /v2/invoices (ingreso). Los campos son los del SDK oficial de FacturAPI. */
export function invoicePayload(inv: InvoiceToStamp, fiscal: FiscalData, billing: BillingSettings = DEFAULT_BILLING, projectKey = '') {
  const method = fiscal.paymentMethod || billing.paymentMethod
  const email = fiscal.emails.split(/[,;\s]+/).find((x) => x.includes('@'))
  return {
    customer: {
      legal_name: stripRegimen(fiscal.legalName).toUpperCase(),
      tax_id: fiscal.rfc.trim().toUpperCase(),
      tax_system: fiscal.taxSystem,
      ...(email ? { email } : {}),
      address: { zip: fiscal.zip.trim() },
    },
    items: [
      {
        quantity: 1,
        product: {
          description: [projectKey, inv.description].filter(Boolean).join(' · ').slice(0, 1000),
          product_key: billing.productKey,
          unit_key: billing.unitKey,
          unit_name: billing.unitName,
          price: cents(inv.amount),
          tax_included: false,
          taxes: [{ type: 'IVA', rate: billing.taxRate }],
        },
      },
    ],
    // Con PPD la forma de pago es 99 (por definir); se informa en el complemento de pago.
    payment_form: method === 'PPD' ? '99' : fiscal.paymentForm && fiscal.paymentForm !== '99' ? fiscal.paymentForm : billing.paymentForm,
    payment_method: method,
    use: fiscal.cfdiUse || billing.cfdiUse,
    ...(billing.series ? { series: billing.series } : {}),
    external_id: inv.id,
    idempotency_key: `sam-inv-${inv.id}`,
  }
}

export interface PaymentToStamp {
  invoiceId: string
  uuid: string
  subtotal: number
  total: number
  paidOn: string
  paymentForm: string
  /** Lo que se pagó, con IVA; por omisión, el total */
  amount?: number
  installment?: number
  lastBalance?: number
  series?: string
  folio?: string
}

/** Cuerpo de POST /v2/invoices tipo P (complemento de recepción de pagos) para una factura PPD. */
export function paymentPayload(p: PaymentToStamp, fiscal: FiscalData, billing: BillingSettings = DEFAULT_BILLING) {
  const amount = cents(p.amount ?? p.total)
  const ratio = p.total ? amount / p.total : 1
  const email = fiscal.emails.split(/[,;\s]+/).find((x) => x.includes('@'))
  return {
    type: 'P',
    customer: {
      legal_name: stripRegimen(fiscal.legalName).toUpperCase(),
      tax_id: fiscal.rfc.trim().toUpperCase(),
      tax_system: fiscal.taxSystem,
      ...(email ? { email } : {}),
      address: { zip: fiscal.zip.trim() },
    },
    complements: [
      {
        type: 'pago',
        data: [
          {
            payment_form: p.paymentForm && p.paymentForm !== '99' ? p.paymentForm : '03',
            date: `${p.paidOn}T12:00:00`,
            related_documents: [
              {
                uuid: p.uuid,
                amount,
                installment: p.installment ?? 1,
                last_balance: cents(p.lastBalance ?? p.total),
                taxes: [{ base: cents(p.subtotal * ratio), type: 'IVA', rate: billing.taxRate }],
                ...(p.series ? { series: p.series } : {}),
              },
            ],
          },
        ],
      },
    ],
    external_id: `${p.invoiceId}-pago`,
    idempotency_key: `sam-pay-${p.invoiceId}-${p.installment ?? 1}`,
  }
}

export interface ParsedCfdi {
  uuid: string
  series: string
  folio: string
  issuedAt: string
  subtotal: number | null
  tax: number | null
  total: number | null
  paymentMethod: 'PUE' | 'PPD' | null
  paymentForm: string
  receiverRfc: string
  receiverName: string
  issuerRfc: string
  type: string
}

function attrs(xml: string, tag: string): Record<string, string> {
  const m = xml.match(new RegExp(`<(?:[\\w]+:)?${tag}\\b([^>]*)>`, 'i'))
  const out: Record<string, string> = {}
  if (!m) return out
  for (const a of m[1].matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)) out[a[1].replace(/^.*:/, '')] = a[2]
  return out
}

const num = (s: string | undefined) => (s && !Number.isNaN(Number(s)) ? Number(s) : null)

/** Lee del XML de un CFDI lo que se guarda en la factura. */
export function parseCfdiXml(xml: string): ParsedCfdi | null {
  const c = attrs(xml, 'Comprobante')
  const t = attrs(xml, 'TimbreFiscalDigital')
  if (!c.Total && !t.UUID) return null
  const r = attrs(xml, 'Receptor')
  const e = attrs(xml, 'Emisor')
  const imp = xml.match(/TotalImpuestosTrasladados\s*=\s*"([^"]*)"/)
  return {
    uuid: (t.UUID ?? '').toUpperCase(),
    series: c.Serie ?? '',
    folio: c.Folio ?? '',
    issuedAt: c.Fecha ?? t.FechaTimbrado ?? '',
    subtotal: num(c.SubTotal),
    tax: num(imp?.[1]),
    total: num(c.Total),
    paymentMethod: c.MetodoPago === 'PUE' || c.MetodoPago === 'PPD' ? c.MetodoPago : null,
    paymentForm: c.FormaPago ?? '',
    receiverRfc: r.Rfc ?? '',
    receiverName: r.Nombre ?? '',
    issuerRfc: e.Rfc ?? '',
    type: c.TipoDeComprobante ?? '',
  }
}
