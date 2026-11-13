import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Ban, CircleCheck, FileCode2, FileText, HandCoins, Mail, Receipt, Stamp, Upload } from 'lucide-react'
import { syncProjectStage } from '../../app/lifecycle'
import { useRepo } from '../../app/session'
import { useFirm, useGlobal } from '../../app/useGlobal'
import { CANCEL_MOTIVE, DEFAULT_BILLING, INVOICE_CONCEPT, PAYMENT_FORM, PAYMENT_METHOD, options } from '../../domain/catalogs'
import { fiscalMissing, parseCfdiXml, totals } from '../../domain/cfdi'
import { addDays, todayInMexico } from '../../domain/dates'
import { fmtDate, fmtMoney } from '../../domain/format'
import type { CfdiInfo, Invoice, ProjectData, StoredFile } from '../../domain/types'
import { base64File, cancelCfdi, emailCfdi, integrations, stampInvoice, stampPayment, type Integrations } from '../../data/services'
import { DateField, FileField, NumberField, SelectField, TextField } from '../../ui/fields'
import { Badge, Button, Card, Notice, type Tone } from '../../ui/kit'
import { useSaver } from '../project/ctx'
import { openStoredFile } from '../../ui/openFile'

export type InvoiceState = 'to_invoice' | 'receivable' | 'overdue' | 'paid' | 'canceled'
export const INVOICE_STATE: Record<InvoiceState, string> = {
  to_invoice: 'Por facturar',
  receivable: 'Por cobrar',
  overdue: 'Vencida',
  paid: 'Cobrada',
  canceled: 'Cancelada',
}
export const STATE_STYLE: Record<InvoiceState, string> = {
  to_invoice: 'bg-soft text-muted',
  receivable: 'bg-accent-soft text-accent-2',
  overdue: 'bg-rojo-soft text-rojo',
  paid: 'bg-verde-soft text-verde',
  canceled: 'bg-soft text-muted line-through',
}
export const STATE_TONE: Record<InvoiceState, Tone> = { to_invoice: 'gray', receivable: 'navy', overdue: 'red', paid: 'green', canceled: 'gray' }

export function dueDate(inv: Invoice, creditDays: number | null | undefined) {
  return inv.invoiceDate ? addDays(inv.invoiceDate, creditDays ?? 0) : null
}

export function invoiceState(inv: Invoice, creditDays: number | null | undefined, today = todayInMexico()): InvoiceState {
  if (inv.cfdi?.status === 'canceled') return 'canceled'
  if (inv.paidDate) return 'paid'
  if (!inv.invoiceDate && !inv.cfdi) return 'to_invoice'
  const due = dueDate(inv, creditDays)
  return due && today > due ? 'overdue' : 'receivable'
}

/** Una factura del proyecto: timbrar o subir, cobrar, complemento, cancelar y archivos. */
export function InvoicePanel({ data, invoice, onChanged, quiet }: { data: ProjectData; invoice: Invoice; onChanged: () => Promise<void> | void; quiet?: boolean }) {
  const repo = useRepo()
  const { firm } = useFirm()
  const files = useGlobal('files')
  const saver = useSaver()
  const [ready, setReady] = useState<Integrations | null>(null)
  const [paying, setPaying] = useState(false)
  const [pay, setPay] = useState({ date: todayInMexico(), amount: null as number | null, reference: '', form: '03' })
  const [canceling, setCanceling] = useState<'01' | '02' | '03' | '04' | null>(null)
  const [outside, setOutside] = useState<{ xml: File | null; pdf: File | null; parsed: ReturnType<typeof parseCfdiXml>; warn: string[]; error: string | null } | null>(null)
  const [proof, setProof] = useState<File | null>(null)
  const [note, setNote] = useState<string | null>(null)
  useEffect(() => {
    void integrations(repo).then(setReady)
  }, [repo])

  const billing = { ...DEFAULT_BILLING, ...(firm.billing ?? {}) }
  const t = totals(invoice.amount ?? 0, billing.taxRate)
  const fiscal = data.project.fiscal
  const missing = fiscalMissing(fiscal)
  const state = invoiceState(invoice, data.project.params.creditDays)
  const fileOf = (id: string | null | undefined) => (id ? files.rows?.find((f) => f.id === id) : undefined)
  const cfdi = invoice.cfdi

  async function saveInvoice(next: Invoice) {
    await repo.save(data.project.id, 'invoices', next)
    const moved = await syncProjectStage(repo, data.project.id, firm)
    if (moved?.from === 'confirmed' && !quiet) setNote('Pago inicial cobrado: el prospecto ya es cliente y el proyecto aparece en Operaciones. Se avisó a Operaciones.')
    await files.reload()
    await onChanged()
  }

  const upload = (file: File, kind: StoredFile['kind'], clientVisible = true) =>
    repo.uploadFile({ projectId: data.project.id, prospectId: data.project.prospectId ?? null, kind, clientVisible, notes: invoice.description }, file)

  async function stamp() {
    if (!fiscal) return
    const r = await stampInvoice(repo, { invoice: { id: invoice.id, description: invoice.description || (invoice.concept ? INVOICE_CONCEPT[invoice.concept] : 'Servicios'), amount: invoice.amount ?? 0 }, fiscal, billing, projectKey: data.project.key })
    const base = `${data.project.key}-factura-${r.cfdi.series}${r.cfdi.folio}`
    const pdf = await upload(base64File(r.pdf, `${base}.pdf`, 'application/pdf'), 'invoice_pdf')
    const xml = await upload(base64File(r.xml, `${base}.xml`, 'application/xml'), 'invoice_xml')
    const info: CfdiInfo = {
      uuid: r.cfdi.uuid,
      series: r.cfdi.series,
      folio: r.cfdi.folio,
      issuedAt: r.cfdi.issuedAt,
      subtotal: t.subtotal,
      tax: t.tax,
      total: r.cfdi.total,
      status: 'valid',
      source: 'facturapi',
      facturapiId: r.cfdi.facturapiId,
      paymentMethod: fiscal.paymentMethod,
      paymentForm: fiscal.paymentMethod === 'PPD' ? '99' : fiscal.paymentForm,
      pdfFileId: pdf.id,
      xmlFileId: xml.id,
    }
    await saveInvoice({ ...invoice, cfdi: info, invoiceDate: (r.cfdi.issuedAt || todayInMexico()).slice(0, 10) })
  }

  /** Lee el XML elegido para mostrar lo que trae antes de guardarlo. */
  async function readXml(xml: File | null) {
    if (!xml) return setOutside((o) => (o ? { ...o, xml: null, parsed: null, warn: [], error: null } : o))
    const parsed = parseCfdiXml(await xml.text())
    const warn: string[] = []
    let error: string | null = null
    if (!parsed?.uuid) error = 'El archivo no parece un CFDI timbrado (no trae folio fiscal).'
    else {
      if (parsed.total != null && Math.abs(parsed.total - t.total) > 1) warn.push(`el total del XML (${fmtMoney(parsed.total)}) no coincide con ${fmtMoney(t.total)}`)
      if (fiscal?.rfc && parsed.receiverRfc && parsed.receiverRfc.toUpperCase() !== fiscal.rfc.toUpperCase()) warn.push(`el RFC del cliente en el XML es ${parsed.receiverRfc}`)
    }
    setOutside((o) => ({ pdf: o?.pdf ?? null, xml, parsed, warn, error }))
  }

  async function saveOutside() {
    const parsed = outside?.parsed
    if (!outside?.xml || !parsed?.uuid) throw new Error('Elige el XML timbrado de la factura.')
    const xml = await upload(outside.xml, 'invoice_xml')
    const pdf = outside.pdf ? await upload(outside.pdf, 'invoice_pdf') : null
    await saveInvoice({
      ...invoice,
      invoiceDate: parsed.issuedAt.slice(0, 10) || todayInMexico(),
      cfdi: {
        uuid: parsed.uuid,
        series: parsed.series,
        folio: parsed.folio,
        issuedAt: parsed.issuedAt,
        subtotal: parsed.subtotal,
        tax: parsed.tax,
        total: parsed.total,
        status: 'valid',
        source: 'upload',
        paymentMethod: parsed.paymentMethod ?? undefined,
        paymentForm: parsed.paymentForm,
        pdfFileId: pdf?.id ?? null,
        xmlFileId: xml.id,
      },
    })
    setOutside(null)
  }

  async function registerPayment() {
    let proofId: string | null = null
    if (proof) proofId = (await upload(proof, 'payment_proof', false)).id
    await saveInvoice({ ...invoice, paidDate: pay.date, payment: { amount: pay.amount ?? cfdi?.total ?? t.total, reference: pay.reference, form: pay.form, proofFileId: proofId, complement: invoice.payment?.complement ?? null } })
    setPaying(false)
    setProof(null)
  }

  async function complement() {
    if (!fiscal || !cfdi || !invoice.paidDate) return
    const r = await stampPayment(repo, {
      payment: { invoiceId: invoice.id, uuid: cfdi.uuid, subtotal: cfdi.subtotal ?? t.subtotal, total: cfdi.total ?? t.total, paidOn: invoice.paidDate, paymentForm: invoice.payment?.form ?? '03', amount: invoice.payment?.amount ?? undefined, series: cfdi.series },
      fiscal,
      billing,
    })
    const base = `${data.project.key}-complemento-pago-${r.cfdi.series}${r.cfdi.folio}`
    await upload(base64File(r.pdf, `${base}.pdf`, 'application/pdf'), 'invoice_pdf')
    await upload(base64File(r.xml, `${base}.xml`, 'application/xml'), 'invoice_xml')
    await saveInvoice({ ...invoice, payment: { ...(invoice.payment ?? { amount: null, reference: '', form: '03' }), complement: { uuid: r.cfdi.uuid, facturapiId: r.cfdi.facturapiId, issuedAt: r.cfdi.issuedAt } } })
  }

  async function cancel() {
    if (!cfdi || !canceling) return
    if (cfdi.facturapiId) await cancelCfdi(repo, cfdi.facturapiId, canceling)
    await saveInvoice({ ...invoice, cfdi: { ...cfdi, status: 'canceled', cancelMotive: canceling, canceledAt: new Date().toISOString() }, invoiceDate: null, paidDate: null })
    setCanceling(null)
  }

  const open = (f: StoredFile | undefined) => openStoredFile(repo, f)

  return (
    <div className="space-y-4">
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {note && <Notice tone="success">{note}</Notice>}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{invoice.concept ? INVOICE_CONCEPT[invoice.concept] : 'Factura'}</div>
            <div className="font-semibold">{invoice.description || 'Sin descripción'}</div>
            <div className="text-sm text-muted">
              {data.project.key} · {data.project.client}
            </div>
          </div>
          <Badge tone={STATE_TONE[state]} dot>
            {INVOICE_STATE[state]}
          </Badge>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted">Subtotal</dt>
            <dd className="num font-semibold">{fmtMoney(t.subtotal)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">IVA {Math.round(billing.taxRate * 100)} %</dt>
            <dd className="num">{fmtMoney(t.tax)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Total</dt>
            <dd className="num font-semibold">{fmtMoney(cfdi?.total ?? t.total)}</dd>
          </div>
        </dl>
        {cfdi && (
          <div className="mt-3 rounded-lg bg-surface p-3 text-sm">
            <div>
              CFDI {cfdi.series}
              {cfdi.folio} · {cfdi.source === 'facturapi' ? 'timbrado con FacturAPI' : 'subido'} · {fmtDate(cfdi.issuedAt.slice(0, 10))}
              {cfdi.paymentMethod && ` · ${cfdi.paymentMethod}`}
            </div>
            <div className="break-all font-mono text-xs text-muted">{cfdi.uuid}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {fileOf(cfdi.pdfFileId) && (
                <Button size="sm" icon={<FileText />} onClick={() => void saver.run(() => open(fileOf(cfdi.pdfFileId)))}>
                  PDF
                </Button>
              )}
              {fileOf(cfdi.xmlFileId) && (
                <Button size="sm" icon={<FileCode2 />} onClick={() => void saver.run(() => open(fileOf(cfdi.xmlFileId)))}>
                  XML
                </Button>
              )}
              {fileOf(invoice.payment?.proofFileId) && (
                <Button size="sm" icon={<Receipt />} onClick={() => void saver.run(() => open(fileOf(invoice.payment?.proofFileId)))}>
                  Comprobante de pago
                </Button>
              )}
            </div>
          </div>
        )}
        {invoice.paidDate && (
          <p className="mt-3 text-sm">
            Cobrada el <b>{fmtDate(invoice.paidDate)}</b>
            {invoice.payment?.reference && ` · referencia ${invoice.payment.reference}`}
            {invoice.payment?.complement && ` · complemento de pago ${invoice.payment.complement.uuid.slice(0, 8)}…`}
          </p>
        )}
      </Card>

      {!cfdi || cfdi.status === 'canceled' ? (
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-bold">Facturar</h3>
          {missing.length > 0 && (
            <Notice tone="warn">
              Faltan datos para facturar: {missing.join(', ')}.{' '}
              {data.project.prospectId ? (
                <Link className="font-semibold underline" to={`/crm/${data.project.prospectId}?paso=cierre`}>
                  Capturarlos en la cita de cierre
                </Link>
              ) : (
                <Link className="font-semibold underline" to={`/p/${data.project.id}/proyecto`}>
                  Capturarlos en el proyecto
                </Link>
              )}
            </Notice>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={<Stamp />} disabled={!ready?.facturapi || missing.length > 0 || !(invoice.amount && invoice.amount > 0)} loading={saver.busy && !outside} onClick={() => void saver.run(stamp)}>
              Timbrar con FacturAPI{ready?.facturapi === 'test' ? ' (pruebas)' : ''}
            </Button>
            <Button icon={<Upload />} disabled={saver.busy} onClick={() => setOutside((o) => (o ? null : { xml: null, pdf: null, parsed: null, warn: [], error: null }))}>
              Subir factura hecha fuera (XML y PDF)
            </Button>
          </div>
          {outside && (
            <div className="space-y-3 rounded-xl border border-accent-mid bg-accent-soft/30 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FileField label="XML del CFDI" accept=".xml,application/xml,text/xml" file={outside.xml} onChange={(f) => void readXml(f)} required />
                <FileField label="PDF de la factura" accept=".pdf,application/pdf" file={outside.pdf} onChange={(f) => setOutside((o) => (o ? { ...o, pdf: f } : o))} help="Opcional, pero conviene para el cliente." />
              </div>
              {outside.error && <Notice tone="error">{outside.error}</Notice>}
              {outside.parsed?.uuid && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-white p-3 text-sm sm:grid-cols-4">
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Folio fiscal</dt>
                    <dd className="break-all font-mono text-xs text-ink">{outside.parsed.uuid}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Serie y folio</dt>
                    <dd className="font-semibold text-ink">
                      {outside.parsed.series}
                      {outside.parsed.folio}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Total</dt>
                    <dd className="num font-semibold text-ink">{outside.parsed.total == null ? '—' : fmtMoney(outside.parsed.total)}</dd>
                  </div>
                </dl>
              )}
              {outside.warn.length > 0 && <Notice tone="warn" title="Revisa antes de guardar">{outside.warn.join('; ')}.</Notice>}
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" disabled={!outside.parsed?.uuid} loading={saver.busy} onClick={() => void saver.run(saveOutside)}>
                  {outside.warn.length ? 'Guardar de todos modos' : 'Guardar la factura'}
                </Button>
                <Button onClick={() => setOutside(null)}>Cancelar</Button>
              </div>
            </div>
          )}
          {!ready?.facturapi && (
            <p className="text-xs text-muted">
              {repo.mode === 'demo' ? 'En la demostración no se timbra: sube el XML y el PDF de una factura de prueba.' : 'El timbrado se activa al guardar FACTURAPI_KEY en Netlify; mientras tanto, sube la factura hecha fuera.'}
            </p>
          )}
          {fiscal && (
            <p className="text-xs text-muted">
              {fiscal.legalName} · {fiscal.rfc} · {PAYMENT_METHOD[fiscal.paymentMethod]} · Uso {fiscal.cfdiUse}
            </p>
          )}
        </Card>
      ) : !invoice.paidDate ? (
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-bold">Cobro</h3>
          {!paying ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon={<HandCoins />} onClick={() => setPaying(true)}>
                Registrar cobro
              </Button>
              {cfdi.facturapiId && (
                <Button
                  icon={<Mail />}
                  disabled={saver.busy}
                  onClick={() =>
                    void saver.run(async () => {
                      await emailCfdi(repo, cfdi.facturapiId!, (fiscal?.emails ?? '').split(/[,;\s]+/).filter((x) => x.includes('@')))
                      setNote('Factura enviada por correo desde FacturAPI.')
                    })
                  }
                >
                  Enviar factura por correo
                </Button>
              )}
              <Button variant="ghost" icon={<Ban />} onClick={() => setCanceling('02')}>
                Cancelar factura
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField label="Fecha del cobro" value={pay.date} onChange={(v) => setPay((x) => ({ ...x, date: v ?? todayInMexico() }))} />
              <NumberField label="Monto cobrado (con IVA)" value={pay.amount ?? cfdi.total ?? t.total} onChange={(v) => setPay((x) => ({ ...x, amount: v }))} suffix="$" />
              <TextField label="Referencia o rastreo" value={pay.reference} onChange={(v) => setPay((x) => ({ ...x, reference: v }))} />
              <SelectField label="Forma de pago" value={pay.form} onChange={(v) => setPay((x) => ({ ...x, form: v ?? '03' }))} options={options(PAYMENT_FORM).filter((o) => o.value !== '99')} allowEmpty={false} />
              <FileField className="sm:col-span-2" label="Comprobante de pago" accept=".pdf,image/*" file={proof} onChange={setProof} help="Opcional: PDF o imagen de la transferencia. Solo lo ve el despacho." />
              <div className="flex gap-2 sm:col-span-2">
                <Button variant="primary" icon={<CircleCheck />} loading={saver.busy} onClick={() => void saver.run(registerPayment)}>
                  Guardar cobro
                </Button>
                <Button
                  onClick={() => {
                    setPaying(false)
                    setProof(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          {canceling && (
            <div className="space-y-2 rounded-lg border border-rojo/30 p-3">
              <SelectField label="Motivo de cancelación (SAT)" value={canceling} onChange={(v) => setCanceling(v ?? '02')} options={options(CANCEL_MOTIVE).filter((o) => o.value === '02' || o.value === '03')} allowEmpty={false} />
              <p className="text-xs text-muted">Para sustituir una factura (motivo 01), primero timbra la nueva y cancela esta desde FacturAPI.</p>
              <div className="flex gap-2">
                <Button variant="danger" disabled={saver.busy} onClick={() => void saver.run(cancel)}>
                  Cancelar ante el SAT
                </Button>
                <Button onClick={() => setCanceling(null)}>No cancelar</Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        cfdi.paymentMethod === 'PPD' &&
        !invoice.payment?.complement && (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-bold">Complemento de pago</h3>
            <p className="text-sm text-ink2">La factura es PPD: al cobrarla se emite el complemento de recepción de pagos.</p>
            <Button variant="primary" icon={<Stamp />} disabled={!ready?.facturapi || missing.length > 0} loading={saver.busy} onClick={() => void saver.run(complement)}>
              Emitir complemento con FacturAPI
            </Button>
            {!ready?.facturapi && (
              <p className="text-xs text-muted">
                {repo.mode === 'demo' ? 'En la demostración no se timbra.' : 'Se activa al guardar FACTURAPI_KEY en Netlify; mientras tanto, emítelo en tu sistema de facturación.'}
              </p>
            )}
          </Card>
        )
      )}
    </div>
  )
}
