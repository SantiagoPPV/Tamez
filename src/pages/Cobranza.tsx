import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useRepo } from '../app/session'
import { INVOICE_CONCEPT, PROJECT_STAGE } from '../domain/catalogs'
import { totals } from '../domain/cfdi'
import { todayInMexico } from '../domain/dates'
import { fmtDate, fmtMoney } from '../domain/format'
import { effectiveStage } from '../domain/stage'
import type { Invoice, ProjectData } from '../domain/types'
import { DataTable, Drawer, Eyebrow, Notice, Spinner, Stat, Card, cx } from '../ui/kit'
import { dueDate, INVOICE_STATE, InvoicePanel, invoiceState, STATE_STYLE, type InvoiceState } from './billing/InvoicePanel'

interface Row {
  key: string
  data: ProjectData
  inv: Invoice
  state: InvoiceState
  due: string | null
  total: number
}

/** Cobranza de todos los clientes: lo que falta facturar, lo que se debe y lo cobrado. */
export function CobranzaPage() {
  const repo = useRepo()
  const [projects, setProjects] = useState<ProjectData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<InvoiceState | 'all' | 'open'>('open')
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
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><Notice tone="error">{error}</Notice></div>
  if (!projects) return <Spinner />

  const month = todayInMexico().slice(0, 7)
  const sum = (xs: Row[]) => xs.reduce((s, r) => s + r.total, 0)
  const by = (s: InvoiceState) => rows.filter((r) => r.state === s)
  const shown = rows
    .filter((r) => (filter === 'all' ? true : filter === 'open' ? r.state !== 'paid' && r.state !== 'canceled' : r.state === filter))
    .filter((r) => !q || `${r.data.project.key} ${r.data.project.client} ${r.inv.description} ${r.inv.cfdi?.uuid ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const current = open ? projects.find((p) => p.project.id === open.projectId) : null
  const currentInv = current?.invoices.find((i) => i.id === open?.invoiceId)

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <div className="mb-6">
        <Eyebrow>Cobranza</Eyebrow>
        <h1 className="text-2xl font-extrabold tracking-tight">Facturación y cobranza</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink2">
          Todas las facturas de los clientes: pago inicial, hitos, cambios de alcance y mensualidades. Se timbran con FacturAPI o se sube la hecha fuera; al cobrar el pago
          inicial, el prospecto se vuelve cliente y su proyecto pasa a Operaciones.
        </p>
      </div>
      <Card className="mb-5 grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
        <Stat label="Por facturar" value={fmtMoney(sum(by('to_invoice')))} hint={`${by('to_invoice').length} facturas`} />
        <Stat label="Por cobrar" value={fmtMoney(sum(by('receivable')))} hint={`${by('receivable').length} facturas`} />
        <Stat label="Vencido" value={<span className={by('overdue').length ? 'text-rojo' : ''}>{fmtMoney(sum(by('overdue')))}</span>} hint={`${by('overdue').length} facturas`} />
        <Stat label="Cobrado este mes" value={fmtMoney(sum(rows.filter((r) => r.inv.paidDate?.startsWith(month))))} />
      </Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['open', 'to_invoice', 'receivable', 'overdue', 'paid', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cx('rounded-full px-3 py-1 text-sm font-semibold', filter === f ? 'bg-accent text-white' : 'bg-soft text-ink2 hover:bg-rule')}
          >
            {f === 'open' ? 'Pendientes' : f === 'all' ? 'Todas' : INVOICE_STATE[f]}
          </button>
        ))}
        <input
          className="ml-auto w-full rounded-lg border border-rule px-3 py-1.5 text-sm sm:w-64"
          placeholder="Buscar cliente, clave o folio fiscal"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar facturas"
        />
      </div>
      <DataTable
        rows={shown}
        rowKey={(r) => r.key}
        onRowClick={(r) => setOpen({ projectId: r.data.project.id, invoiceId: r.inv.id })}
        empty="Sin facturas con este filtro."
        columns={[
          {
            label: 'Cliente',
            render: (r) => (
              <div>
                <div className="font-semibold">{r.data.project.client || r.data.project.name}</div>
                <div className="text-xs text-muted">
                  {r.data.project.key} · {PROJECT_STAGE[effectiveStage(r.data)]}
                </div>
              </div>
            ),
          },
          { label: 'Concepto', render: (r) => <span>{r.inv.concept ? INVOICE_CONCEPT[r.inv.concept] : '—'}<span className="block text-xs text-muted">{r.inv.description}</span></span> },
          { label: 'Total', render: (r) => <span className="num">{fmtMoney(r.total)}</span>, className: 'text-right' },
          { label: 'Factura', render: (r) => (r.inv.cfdi ? <span className="text-xs">{r.inv.cfdi.series}{r.inv.cfdi.folio} · {fmtDate(r.inv.invoiceDate)}</span> : <span className="text-xs text-muted">Sin factura</span>) },
          { label: 'Vence', render: (r) => <span className={cx('num text-xs', r.state === 'overdue' && 'font-semibold text-rojo')}>{fmtDate(r.due)}</span> },
          { label: 'Estado', render: (r) => <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', STATE_STYLE[r.state])}>{INVOICE_STATE[r.state]}</span> },
        ]}
        card={(r) => (
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{r.data.project.client || r.data.project.name}</div>
                <div className="text-xs text-muted">
                  {r.data.project.key} · {r.inv.concept ? INVOICE_CONCEPT[r.inv.concept] : ''}
                </div>
              </div>
              <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', STATE_STYLE[r.state])}>{INVOICE_STATE[r.state]}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="num font-semibold">{fmtMoney(r.total)}</span>
              <span className="text-xs text-muted">{r.due ? `Vence ${fmtDate(r.due)}` : 'Sin factura'}</span>
            </div>
          </div>
        )}
      />
      {current && currentInv && (
        <Drawer open onClose={() => setOpen(null)} title={`${current.project.key} · ${currentInv.description || 'Factura'}`} subtitle={current.project.client}>
          <InvoicePanel data={current} invoice={currentInv} onChanged={load} />
          <Link to={`/p/${current.project.id}/cobranza`} className="mt-4 inline-block text-sm font-semibold text-accent">
            Ver la cobranza del proyecto
          </Link>
        </Drawer>
      )}
    </main>
  )
}
