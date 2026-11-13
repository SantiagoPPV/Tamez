import { describe, expect, it } from 'vitest'
import { DEFAULT_BILLING } from './catalogs'
import { fiscalMissing, invoicePayload, parseCfdiXml, paymentPayload, stripRegimen, totals } from './cfdi'
import type { FiscalData } from './types'

const fiscal: FiscalData = { rfc: 'cej150302ab4', legalName: 'Cliente Ejemplo, S.A. de C.V.', taxSystem: '601', zip: '06600', cfdiUse: 'G03', emails: 'facturas@clienteejemplo.mx, otra@clienteejemplo.mx', paymentMethod: 'PPD', paymentForm: '99' }

describe('CFDI 4.0 con FacturAPI', () => {
  it('IVA y total a centavos', () => {
    expect(totals(40000)).toEqual({ subtotal: 40000, tax: 6400, total: 46400 })
    expect(totals(1234.567)).toEqual({ subtotal: 1234.57, tax: 197.53, total: 1432.1 })
  })

  it('la razón social va sin régimen societario', () => {
    expect(stripRegimen('Cliente Ejemplo, S.A. de C.V.')).toBe('Cliente Ejemplo')
    expect(stripRegimen('Grupo Ejemplo SAPI de CV')).toBe('Grupo Ejemplo')
    expect(stripRegimen('Servicios Ejemplo, S. de R.L. de C.V.')).toBe('Servicios Ejemplo')
    expect(stripRegimen('Asociación Ejemplo A.C.')).toBe('Asociación Ejemplo')
    expect(stripRegimen('Juan Pérez')).toBe('Juan Pérez')
  })

  it('faltantes de los datos para facturar', () => {
    expect(fiscalMissing(fiscal)).toEqual([])
    expect(fiscalMissing({ ...fiscal, rfc: 'XYZ', zip: '123' })).toEqual(['RFC válido (12 o 13 caracteres)', 'Código postal fiscal (5 dígitos)'])
    expect(fiscalMissing(null)).toHaveLength(5)
  })

  it('factura de ingreso: precio sin IVA, IVA 16 %, PPD con forma 99, sin duplicados', () => {
    const body = invoicePayload({ id: 'inv-1', description: 'Pago inicial', amount: 40000 }, fiscal, DEFAULT_BILLING, 'CE-INV')
    expect(body.customer).toEqual({ legal_name: 'CLIENTE EJEMPLO', tax_id: 'CEJ150302AB4', tax_system: '601', email: 'facturas@clienteejemplo.mx', address: { zip: '06600' } })
    expect(body.items[0].product).toMatchObject({ description: 'CE-INV · Pago inicial', price: 40000, tax_included: false, taxes: [{ type: 'IVA', rate: 0.16 }], unit_key: 'E48' })
    expect(body).toMatchObject({ payment_method: 'PPD', payment_form: '99', use: 'G03', series: 'A', external_id: 'inv-1', idempotency_key: 'sam-inv-inv-1' })
    const pue = invoicePayload({ id: 'inv-2', description: 'Hito 1', amount: 90000 }, { ...fiscal, paymentMethod: 'PUE', paymentForm: '03' })
    expect(pue).toMatchObject({ payment_method: 'PUE', payment_form: '03' })
  })

  it('complemento de pago de una factura PPD', () => {
    const body = paymentPayload({ invoiceId: 'inv-1', uuid: 'ABC-123', subtotal: 40000, total: 46400, paidOn: '2027-01-08', paymentForm: '03' }, fiscal)
    expect(body.type).toBe('P')
    const pay = body.complements[0].data[0]
    expect(pay).toMatchObject({ payment_form: '03', date: '2027-01-08T12:00:00' })
    expect(pay.related_documents[0]).toEqual({ uuid: 'ABC-123', amount: 46400, installment: 1, last_balance: 46400, taxes: [{ base: 40000, type: 'IVA', rate: 0.16 }] })
  })

  it('lee el XML de una factura hecha fuera', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="A" Folio="15" Fecha="2027-01-07T10:15:00" SubTotal="40000.00" Total="46400.00" MetodoPago="PPD" FormaPago="99" TipoDeComprobante="I">
  <cfdi:Emisor Rfc="EKU9003173C9" Nombre="EMPRESA DE EJEMPLO" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="CEJ150302AB4" Nombre="CLIENTE EJEMPLO" UsoCFDI="G03"/>
  <cfdi:Impuestos TotalImpuestosTrasladados="6400.00"/>
  <cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" UUID="5f1e2d3c-0000-4000-8000-1234567890ab" FechaTimbrado="2027-01-07T10:16:00"/></cfdi:Complemento>
</cfdi:Comprobante>`
    expect(parseCfdiXml(xml)).toEqual({
      uuid: '5F1E2D3C-0000-4000-8000-1234567890AB',
      series: 'A',
      folio: '15',
      issuedAt: '2027-01-07T10:15:00',
      subtotal: 40000,
      tax: 6400,
      total: 46400,
      paymentMethod: 'PPD',
      paymentForm: '99',
      receiverRfc: 'CEJ150302AB4',
      receiverName: 'CLIENTE EJEMPLO',
      issuerRfc: 'EKU9003173C9',
      type: 'I',
    })
    expect(parseCfdiXml('<html>no es CFDI</html>')).toBeNull()
  })
})
