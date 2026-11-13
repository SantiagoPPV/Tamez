import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CircleAlert, CircleCheck, FilePlus2, HandCoins, Search } from 'lucide-react'
import { useRepo } from '../app/session'
import { INVOICE_CONCEPT, PROJECT_STAGE } from '../domain/catalogs'
import { totals } from '../domain/cfdi'
import { diffDays, todayInMexico } from '../domain/dates'
import { fmtDate, fmtMoney } from '../domain/format'
import { effectiveStage } from '../domain/stage'
import type { Invoice, ProjectData } from '../domain/types'
import { fieldClass } from '../ui/fields'
import { Avatar, Badge, cx, DataTable, Drawer, KpiCard, LinkButton, Notice, PageHeader, Segmented, Spinner } from '../ui/kit'
import { dueDate, INVOICE_STATE, InvoicePanel, invoiceState, STATE_TONE, type InvoiceState } from './billing/InvoicePanel'

interface Row {
  key: string
  data: ProjectData
  inv: Invoice
  state: InvoiceState
  due: string | null
  total: number
}
type Filter = InvoiceState | 'all' | 'open'

/** Cobranza de todos los clientes: lo que falta facturar, lo que se debe y lo cobrado. */
export function CobranzaPage() {
  const repo = useRepo()
  const [projects, setProjects] = useState<ProjectData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('open')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<{ projectId: string; invoiceId: string } | null>(null)

  const load = useCallback(async () => {
    try {
      setProjects(await repo.loadAllProjects())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [repo])
  useEffect(() => {
    void load()
  }, [load])

  const rows: Row[] = useMemo(
    () =>
      (projects ?? [])
        .filter((d) => effectiveStage(d) !== 'cancelled')
        .flatMap((d) =>
          d.invoices.map((inv) => ({
            key: inv.id,
            data: d,
            inv,
            state: invoiceState(inv, d.project.params.creditDays),
            due: dueDate(inv, d.project.params.creditDays),
            total: inv.cfdi?.total ?? totals(inv.amount ?? 0).total,
          })),
        ),
    [projects],
  )
  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Notice tone="error">{error}</Notice>
      </div>
    )
  if (!projects) return <Spinner />

  const today = todayInMexico()
  const month = today.slice(0, 7)
  const sum = (xs: Row[]) => xs.reduce((s, r) => s + r.total, 0)
  const by = (s: InvoiceState) => rows.filter((r) => r.state === s)
  const matches = (r: Row, f: Filter) => (f === 'all' ? true : f === 'open' ? r.state !== 'paid' && r.state !== 'canceled' : r.state === f)
  const term = q.trim().toLowerCase()
  const shown = rows
    .filter((r) => matches(r, filter))
    .filter((r) => !term || `${r.data.project.key} ${r.data.project.client} ${r.inv.description} ${r.inv.cfdi?.uuid ?? ''}`.toLowerCase().includes(term))
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const current = open ? projects.find((p) => p.project.id === open.projectId) : null
  const currentInv = current?.invoices.find((i) => i.id === open?.invoiceId)
  const FILTERS: Filter[] = ['open', 'to_invoice', 'receivable', 'overdue', 'paid', 'all']

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Cobranza"
        title="Facturación y cobranza"
        subtitle="Todas las facturas de los clientes: pago inicial, hitos, cambios de alcance y mensualidades. Se timbran con FacturAPI o se sube la hecha fuera; al cobrar el pago inicial, el prospecto se vuelve cliente y su proyecto pasa a Operaciones."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Por facturar" value={fmtMoney(sum(by('to_invoice')))} hint={`${by('to_invoice').length} facturas`} icon={<FilePlus2 />} tone="gray" />
        <KpiCard label="Por cobrar" value={fmtMoney(sum(by('receivable')))} hint={`${by('receivable').length} facturas en plazo`} icon={<HandCoins />} />
        <KpiCard label="Vencido" value={fmtMoney(sum(by('overdue')))} hint={`${by('overdue').length} facturas fuera de plazo`} icon={<CircleAlert />} tone="red" alert={by('overdue').length > 0} />
        <KpiCard label="Cobrado este mes" value={fmtMoney(sum(rows.filter((r) => r.inv.paidDate?.startsWith(month))))} hint="Con fecha de cobro de este mes" icon={<CircleCheck />} tone="green" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          label="Estado de la factura"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({ value: f, label: f === 'open' ? 'Pendientes' : f === 'all' ? 'Todas' : INVOICE_STATE[f], count: rows.filter((r) => matches(r, f)).length }))}
        />
        <label className="relative w-full sm:ml-auto sm:w-72">
          <span className="sr-only">Buscar facturas</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className={cx(fieldClass, 'pl-9')} placeholder="Buscar cliente, clave o folio fiscal" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar facturas" />
        </label>
      </div>

      <DataTable
        rows={shown}
        rowKey={(r) => r.key}
        onRowClick={(r) => setOpen({ projectId: r.data.project.id, invoiceId: r.inv.id })}
        empty="Sin facturas con este filtro."
        rowClassName={(r) => (r.state === 'overdue' ? 'bg-rojo-soft/30' : undefined)}
        columns={[
          {
            label: 'Cliente',
            render: (r) => (
              <div className="flex items-center gap-3">
                <Avatar name={r.data.project.client || r.data.project.name} tone="soft" size="sm" />
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{r.data.project.client || r.data.project.name}</div>
                  <div className="text-xs text-muted">
                    {r.data.project.key} · {PROJECT_STAGE[effectiveStage(r.data)]}
                  </div>
                </div>
              </div>
            ),
          },
          {
            label: 'Concepto',
            render: (r) => (
              <span>
                <span className="font-medium text-ink">{r.inv.concept ? INVOICE_CONCEPT[r.inv.concept] : '—'}</span>
                <span className="block text-xs text-muted">{r.inv.description}</span>
              </span>
            ),
          },
          { label: 'Total', headClassName: 'text-right', className: 'num text-right font-semibold text-ink', render: (r) => fmtMoney(r.total) },
          {
            label: 'Factura',
            render: (r) =>
              r.inv.cfdi ? (
                <span className="text-xs">
                  <span className="font-semibold text-ink">
                    {r.inv.cfdi.series}
                    {r.inv.cfdi.folio}
                  </span>{' '}
                  · {fmtDate(r.inv.invoiceDate)}
                </span>
              ) : (
                <span className="text-xs text-muted">Sin factura</span>
              ),
          },
          {
            label: 'Vence',
            render: (r) => (
              <span className={cx('num text-xs', r.state === 'overdue' ? 'font-semibold text-rojo' : 'text-ink2')}>
                {fmtDate(r.due)}
                {r.state === 'overdue' && r.due && <span className="block">hace {diffDays(r.due, today)} días</span>}
              </span>
            ),
          },
          {
            label: 'Estado',
            render: (r) => (
              <Badge tone={STATE_TONE[r.state]} dot>
                {INVOICE_STATE[r.state]}
              </Badge>
            ),
          },
        ]}
        card={(r) => (
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-ink">{r.data.project.client || r.data.project.name}</div>
                <div className="text-xs text-muted">
                  {r.data.project.key} · {r.inv.concept ? INVOICE_CONCEPT[r.inv.concept] : ''}
                </div>
              </div>
              <Badge tone={STATE_TONE[r.state]} dot>
                {INVOICE_STATE[r.state]}
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="num font-bold text-ink">{fmtMoney(r.total)}</span>
              <span className={cx('text-xs', r.state === 'overdue' ? 'font-semibold text-rojo' : 'text-muted')}>{r.due ? `Vence ${fmtDate(r.due)}` : 'Sin factura'}</span>
            </div>
          </div>
        )}
      />
      {current && currentInv && (
        <Drawer
          open
          wide
          onClose={() => setOpen(null)}
          title={`${current.project.key} · ${currentInv.description || 'Factura'}`}
          subtitle={current.project.client}
          footer={
            <LinkButton to={`/p/${current.project.id}/cobranza`} variant="ghost" size="sm" icon={<ArrowUpRight />}>
              Ver la cobranza del proyecto
            </LinkButton>
          }
        >
          <InvoicePanel data={current} invoice={currentInv} onChanged={load} />
        </Drawer>
      )}
    </main>
  )
}
