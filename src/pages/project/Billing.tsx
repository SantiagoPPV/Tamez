import { INVOICE_CONCEPT, options } from '../../domain/catalogs'
import { localId } from '../../domain/factory'
import { fmtDate, fmtMoney } from '../../domain/format'
import type { Invoice } from '../../domain/types'
import { DateField, FormGrid, NumberField, SelectField, TextField } from '../../ui/fields'
import { Button, Card, cx, DataTable, Drawer, Notice, Stat } from '../../ui/kit'
import { useDraft, useP, useSaver } from './ctx'

const STATUS_STYLE: Record<string, string> = {
  'Por facturar': 'bg-soft text-muted',
  Cobrada: 'bg-accent-soft text-accent-2',
  'Por cobrar': 'bg-ambar-soft text-ambar',
  Vencida: 'bg-rojo-soft text-rojo',
  'Vencida: pausar el siguiente hito': 'bg-rojo text-white',
}

export function BillingPage() {
  const { data, result } = useP()
  const edit = useDraft<Invoice>()
  const p = data.project.params
  const rows = [...data.invoices].sort((a, b) => a.position - b.position)
  const c = (x: Invoice) => result.invoices.get(x.id)

  return (
    <div className="space-y-5">
      <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <Stat label="Facturado al corte" value={fmtMoney(result.billing.invoiced)} />
        <Stat label="Cobrado al corte" value={fmtMoney(result.billing.collected)} />
        <Stat label="Por cobrar" value={fmtMoney(result.billing.receivable)} />
        <Stat label="Facturas vencidas" value={result.billing.overdueInvoices} />
      </Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl text-sm text-ink2">
          <p>
            Pago a {p.creditDays ?? '—'} días naturales; pausa del siguiente hito a los {p.pauseAfterOverdueDays} días hábiles de retraso. Costo real menos
            cobrado: <b className="num">{fmtMoney(result.figures.realCostMinusCollected)}</b>.
          </p>
          {p.paymentDocuments && <p className="mt-1 text-xs text-muted">Para pagar pide: {p.paymentDocuments}</p>}
          {p.invoiceReception && <p className="text-xs text-muted">Recibe facturas: {p.invoiceReception}</p>}
        </div>
        <Button
          variant="primary"
          onClick={() =>
            edit.setDraft({
              id: localId('inv'),
              position: Math.max(0, ...data.invoices.map((x) => x.position)) + 1,
              concept: 'milestone',
              description: '',
              amount: null,
              purchaseOrder: '',
              invoiceDate: null,
              paidDate: null,
            })
          }
        >
          Nueva factura
        </Button>
      </div>
      <DataTable
        rows={rows}
        rowKey={(x) => x.id}
        onRowClick={(x) => edit.setDraft(structuredClone(x))}
        empty="Sin facturas."
        columns={[
          { label: 'Concepto', className: 'whitespace-nowrap', render: (x) => (x.concept ? INVOICE_CONCEPT[x.concept] : '') },
          { label: 'Descripción', render: (x) => <div className="min-w-[14rem]">{x.description}</div> },
          { label: 'Monto', className: 'num text-right', headClassName: 'text-right', render: (x) => fmtMoney(x.amount) },
          { label: 'OC', className: 'text-xs', render: (x) => x.purchaseOrder },
          { label: 'Factura', className: 'num whitespace-nowrap', render: (x) => fmtDate(x.invoiceDate) },
          { label: 'Vence', className: 'num whitespace-nowrap', render: (x) => fmtDate(c(x)?.dueDate) },
          { label: 'Cobro', className: 'num whitespace-nowrap', render: (x) => fmtDate(x.paidDate) },
          { label: 'Días', className: 'num text-right', headClassName: 'text-right', render: (x) => c(x)?.daysToCollect ?? '' },
          { label: 'Atraso háb.', className: 'num text-right', headClassName: 'text-right', render: (x) => c(x)?.businessDaysLate ?? '' },
          {
            label: 'Estado',
            render: (x) =>
              c(x)?.status ? (
                <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', STATUS_STYLE[c(x)!.status!])}>{c(x)!.status}</span>
              ) : null,
          },
        ]}
        card={(x) => (
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold">{x.description || (x.concept ? INVOICE_CONCEPT[x.concept] : '')}</span>
              {c(x)?.status && <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_STYLE[c(x)!.status!])}>{c(x)!.status}</span>}
            </div>
            <div className="num text-xs text-muted">
              {fmtMoney(x.amount)} · factura {fmtDate(x.invoiceDate) || '—'} · cobro {fmtDate(x.paidDate) || '—'}
            </div>
          </div>
        )}
      />
      {edit.draft && <InvoiceForm draft={edit.draft} set={edit.set} close={() => edit.setDraft(null)} />}
    </div>
  )
}

function InvoiceForm({ draft, set, close }: { draft: Invoice; set: <K extends keyof Invoice>(k: K, v: Invoice[K]) => void; close: () => void }) {
  const { data, save, remove } = useP()
  const saver = useSaver()
  const isNew = !data.invoices.some((x) => x.id === draft.id)
  async function submit() {
    if (draft.amount == null) return saver.setError('Falta el monto sin IVA.')
    const ok = await saver.run(() => save('invoices', draft))
    if (ok) close()
  }
  return (
    <Drawer
      open
      onClose={close}
      title={isNew ? 'Nueva factura' : 'Factura'}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void submit()} disabled={saver.busy}>
            Guardar
          </Button>
          <Button onClick={close}>Cancelar</Button>
          <div className="flex-1" />
          {!isNew && (
            <Button variant="danger" onClick={() => confirm('¿Borrar esta factura?') && void saver.run(() => remove('invoices', draft.id)).then((ok) => ok && close())}>
              Borrar
            </Button>
          )}
        </div>
      }
    >
      {saver.error && (
        <div className="mb-4">
          <Notice tone="error">{saver.error}</Notice>
        </div>
      )}
      <FormGrid>
        <SelectField label="Concepto" value={draft.concept} onChange={(v) => set('concept', v)} options={options(INVOICE_CONCEPT)} />
        <NumberField label="Monto sin IVA" value={draft.amount} onChange={(v) => set('amount', v)} />
        <TextField className="sm:col-span-2" label="Descripción" value={draft.description} onChange={(v) => set('description', v)} />
        <TextField label="Orden de compra" value={draft.purchaseOrder} onChange={(v) => set('purchaseOrder', v)} />
        <div />
        <DateField label="Fecha de factura" value={draft.invoiceDate} onChange={(v) => set('invoiceDate', v)} />
        <DateField label="Fecha de cobro" value={draft.paidDate} onChange={(v) => set('paidDate', v)} />
      </FormGrid>
    </Drawer>
  )
}
