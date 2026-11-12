import { Link, useParams } from 'react-router'
import { CHANNEL, DEPENDS_ON, HOUR_CLASS, HOUR_MARK, REQUEST_KIND, REQUEST_STATUS, RISK_CLASS, RISK_STATUS, SEVERITY } from '../../domain/catalogs'
import { fmtDate, fmtHours, fmtMoney, fmtPct, folio } from '../../domain/format'
import { Button } from '../../ui/kit'
import { names, useP } from './ctx'

/** D11 (presupuesto interno) y D13 (bitácora del proyecto): vistas del módulo de control, para imprimir. */
export function PrintView() {
  const { what = 'd11' } = useParams()
  const { data, result: r } = useP()
  const n = names(data)
  const p = data.project
  const title = what === 'd13' ? 'D13 · Bitácora del proyecto' : 'D11 · Presupuesto interno'
  return (
    <div className="print-area mx-auto max-w-5xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="../documentos" relative="path" className="text-sm font-semibold text-accent">
          ← Documentos
        </Link>
        <Button variant="primary" onClick={() => window.print()}>
          Imprimir o guardar PDF
        </Button>
      </div>
      <div className="rounded-xl border border-rule bg-white p-6 print:border-0 print:p-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{title}</div>
        <h1 className="text-2xl font-extrabold tracking-tight">{p.name}</h1>
        <p className="text-sm text-muted">
          {p.key} · {p.client} · al corte del {fmtDate(r.cutoff)} · {what === 'd11' ? `versión ${p.budgetVersion}` : 'documento interno'}
        </p>
        {what === 'd11' && <p className="mt-1 text-xs italic text-muted">Documento interno. No se envía al cliente ni se adjunta a propuestas, reportes o actas.</p>}
        <div className="mt-5 space-y-6 text-sm">
          {what === 'd11' ? (
            <>
              <T
                head={['Concepto', 'Horas', 'Pesos']}
                rows={[
                  ['Horas planeadas (actividades del desglose)', fmtHours(r.budget.plannedHours), fmtMoney(r.budget.plannedCost)],
                  [`Reserva para imprevistos (${fmtPct(p.params.reservePct)})`, fmtHours(r.budget.reserveHours), fmtMoney(r.budget.reserveCost)],
                  [`Bolsa de ajustes (${fmtPct(p.params.poolPct)})`, fmtHours(r.budget.poolHours), fmtMoney(r.budget.poolCost)],
                  ['Horas presupuestadas y costo de horas', fmtHours(r.budget.budgetedHours), fmtMoney(r.budget.hoursCost)],
                  ['Gastos directos', '', fmtMoney(r.budget.directCosts)],
                  ['Costo total', '', fmtMoney(r.budget.totalCost)],
                  ['Precio vigente', '', fmtMoney(r.budget.currentPrice)],
                  ['Margen esperado', '', `${fmtMoney(r.budget.expectedMargin)} (${fmtPct(r.budget.expectedMarginPct)})`],
                  ['Alerta de margen proyectado', '', fmtPct(r.budget.marginAlertPct)],
                ]}
              />
              <T
                head={['Seguimiento al corte', 'Planeado', 'Real', 'Falta', 'Cierre']}
                rows={[
                  ['Horas', fmtHours(r.tracking.hours.planned), fmtHours(r.tracking.hours.real), fmtHours(r.tracking.hours.toGo), fmtHours(r.tracking.hours.projected)],
                  ['Costo de horas', fmtMoney(r.tracking.hoursCost.planned), fmtMoney(r.tracking.hoursCost.real), fmtMoney(r.tracking.hoursCost.toGo), fmtMoney(r.tracking.hoursCost.projected)],
                  ['Gastos directos', fmtMoney(r.tracking.directCosts.planned), fmtMoney(r.tracking.directCosts.real), fmtMoney(r.tracking.directCosts.toGo), fmtMoney(r.tracking.directCosts.projected)],
                  ['Costo total', fmtMoney(r.tracking.totalCost.planned), fmtMoney(r.tracking.totalCost.real), fmtMoney(r.tracking.totalCost.toGo), fmtMoney(r.tracking.totalCost.projected)],
                  ['Margen', fmtMoney(r.tracking.expectedMargin), '', '', `${fmtMoney(r.tracking.projectedMargin)} (${fmtPct(r.tracking.projectedMarginPct)})`],
                  ['Formación y revisión por delegación (aparte)', fmtMoney(r.tracking.trainingCap), fmtMoney(r.tracking.trainingCost), '', fmtPct(r.tracking.marginWithTrainingPct)],
                ]}
              />
              <T head={['Bloque', 'Horas planeadas', 'Horas reales al corte']} rows={r.budget.byBlock.map((b) => [String(b.block), fmtHours(b.planned), fmtHours(b.real)])} />
            </>
          ) : (
            <>
              <H>Bitácora de trabajo</H>
              <T
                head={['Folio', 'Fecha', 'Persona', 'Clave', 'Qué se hizo', 'Horas', 'Clase', 'Folio rel.']}
                rows={[...data.workLogs].sort((a, b) => a.seq - b.seq).map((l) => [folio.workLog(l.seq), fmtDate(l.date), n.member(l.personId), l.activityKey, l.description, fmtHours(l.hours), `${l.hourClass ? HOUR_CLASS[l.hourClass] : ''}${l.mark ? ` · ${HOUR_MARK[l.mark]}` : ''}`, l.relatedFolio ?? ''])}
              />
              <H>Decisiones</H>
              <T head={['Folio', 'Fecha', 'Decisión', 'Quién', 'Por qué', 'Dónde consta']} rows={data.decisions.map((x) => [folio.decision(x.seq), fmtDate(x.date), x.decision, x.decidedBy, x.why, x.recordedIn])} />
              <H>Cambios</H>
              <T
                head={['Folio', 'Fecha', 'Canal', 'Qué pide', 'Tipo', 'Horas', 'Estado']}
                rows={data.changes.map((x) => [folio.change(x.seq), fmtDate(x.date), x.channel ? CHANNEL[x.channel] : '', x.description, x.kind ? REQUEST_KIND[x.kind] : '', fmtHours(x.hours), x.status ? REQUEST_STATUS[x.status] : ''])}
              />
              <H>Riesgos e incidentes</H>
              <T
                head={['Folio', 'Fecha', 'Clase', 'Descripción', 'Gravedad', 'Depende de', 'Estado']}
                rows={data.risks.map((x) => [folio.risk(x.seq), fmtDate(x.date), x.riskClass ? RISK_CLASS[x.riskClass] : '', x.description, x.severity ? SEVERITY[x.severity] : '', x.dependsOn ? DEPENDS_ON[x.dependsOn] : '', x.status ? RISK_STATUS[x.status] : ''])}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function H({ children }: { children: string }) {
  return <h2 className="mt-4 text-base font-bold">{children}</h2>
}

function T({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            {head.map((h) => (
              <th key={h} className="px-1.5 py-1 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-rule align-top">
              {r.map((c, j) => (
                <td key={j} className={j > 0 && /^[$\d.,\-\s%()]+$/.test(c) ? 'num px-1.5 py-1 text-right' : 'px-1.5 py-1'}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
