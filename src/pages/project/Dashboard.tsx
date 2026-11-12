import { useState } from 'react'
import type { Indicator } from '../../domain/control'
import { diffDays } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate, fmtHours, fmtIndex, fmtInt, fmtMoney, fmtPct } from '../../domain/format'
import { DateField } from '../../ui/fields'
import { Button, Card, cx, LightBadge, Notice, SectionTitle } from '../../ui/kit'
import { useP, useSaver } from './ctx'

export function fmtIndicator(i: Pick<Indicator, 'value' | 'format'>): string {
  if (i.value == null) return 'Sin dato'
  switch (i.format) {
    case 'index':
      return fmtIndex(i.value)
    case 'pct':
      return fmtPct(i.value)
    case 'hours':
      return fmtHours(i.value)
    default:
      return fmtInt(i.value)
  }
}

export function Dashboard() {
  const { data, result: r, updateProject, save } = useP()
  const { project } = data
  const saver = useSaver()
  const [saved, setSaved] = useState<string | null>(null)
  const week = project.startDate ? Math.floor(diffDays(project.startDate, r.cutoff) / 7) + 1 : 1
  const existing = data.snapshots.find((s) => s.week === week)

  return (
    <div className="space-y-8">
      <Card className="flex flex-wrap items-end gap-4 p-4">
        <DateField
          className="w-full sm:w-56"
          label="Fecha de corte"
          help="Vacía = hoy. El viernes de la semana (o el día hábil anterior)."
          value={project.cutoffDate}
          onChange={(v) => void saver.run(() => updateProject({ ...project, cutoffDate: v }))}
        />
        <div className="flex-1" />
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button
            variant="primary"
            disabled={saver.busy}
            onClick={() =>
              void saver.run(async () => {
                await save('snapshots', {
                  id: existing?.id ?? localId('snap'),
                  week,
                  cutoff: r.cutoff,
                  values: r.snapshot.values,
                  lights: r.snapshot.lights,
                })
                setSaved(`Corte de la semana ${week} guardado.`)
              })
            }
          >
            {existing ? `Reemplazar el corte de la semana ${week}` : `Guardar el corte de la semana ${week}`}
          </Button>
          <span className="text-xs text-muted">Guarda lo que se reporta hoy; ya no cambia con las reestimaciones.</span>
        </div>
      </Card>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {saved && <Notice>{saved}</Notice>}

      <section>
        <SectionTitle aside={<LightBadge light={r.generalLight} />}>Tablero al corte: once indicadores</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {r.indicators.map((i) => (
            <IndicatorCard key={i.key} i={i} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle>Presupuesto interno (D11)</SectionTitle>
          <p className="mb-3 text-xs italic text-muted">Documento interno. No se envía al cliente.</p>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Concepto</th>
                  <th className="px-3 py-2 text-right">Horas</th>
                  <th className="px-3 py-2 text-right">Pesos</th>
                </tr>
              </thead>
              <tbody className="num">
                <Row label="Horas planeadas (actividades del desglose)" h={r.budget.plannedHours} m={r.budget.plannedCost} />
                <Row label={`Reserva para imprevistos (${fmtPct(project.params.reservePct)})`} h={r.budget.reserveHours} m={r.budget.reserveCost} />
                <Row label={`Bolsa de ajustes (${fmtPct(project.params.poolPct)})`} h={r.budget.poolHours} m={r.budget.poolCost} />
                <Row label="Horas presupuestadas y costo de horas" h={r.budget.budgetedHours} m={r.budget.hoursCost} strong />
                <Row label="Gastos directos" m={r.budget.directCosts} />
                <Row label="Costo total" m={r.budget.totalCost} strong />
                <Row label="Precio vigente (con cambios cobrados)" m={r.budget.currentPrice} />
                <Row label="Margen esperado" m={r.budget.expectedMargin} strong extra={fmtPct(r.budget.expectedMarginPct)} />
                <Row label="Alerta de margen proyectado" extra={fmtPct(r.budget.marginAlertPct)} />
              </tbody>
            </table>
          </Card>
          <p className="mt-2 text-xs text-muted">
            {r.budget.minMarginCheck} · Pagos: {fmtMoney(r.paymentsSum)} {r.paymentsCheck && `(${r.paymentsCheck.toLowerCase()})`} · Línea
            base: {r.baselineCheck.toLowerCase()}
          </p>
        </div>

        <div>
          <SectionTitle>Seguimiento al corte</SectionTitle>
          <p className="mb-3 text-xs italic text-muted">Real a la fecha, lo que falta y la proyección al cierre.</p>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Concepto</th>
                  <th className="px-3 py-2 text-right">Planeado</th>
                  <th className="px-3 py-2 text-right">Real</th>
                  <th className="px-3 py-2 text-right">Falta</th>
                  <th className="px-3 py-2 text-right">Cierre</th>
                </tr>
              </thead>
              <tbody className="num">
                <Track label="Horas" v={r.tracking.hours} f={fmtHours} />
                <Track label="Costo de horas" v={r.tracking.hoursCost} f={fmtMoney} />
                <Track label="Gastos directos" v={r.tracking.directCosts} f={fmtMoney} />
                <Track label="Costo total" v={r.tracking.totalCost} f={fmtMoney} strong />
                <tr className="border-t border-rule">
                  <td className="px-3 py-2 font-semibold">Margen</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(r.tracking.expectedMargin)}</td>
                  <td />
                  <td />
                  <td className="px-3 py-2 text-right font-bold">{fmtMoney(r.tracking.projectedMargin)}</td>
                </tr>
                <tr className="border-t border-rule">
                  <td className="px-3 py-2 font-semibold">Margen (%)</td>
                  <td className="px-3 py-2 text-right">{fmtPct(r.tracking.expectedMarginPct)}</td>
                  <td />
                  <td className="px-3 py-2 text-right text-xs text-muted">{r.tracking.marginDiff != null && `${fmtPct(r.tracking.marginDiff)}`}</td>
                  <td className="px-3 py-2 text-right font-bold">{fmtPct(r.tracking.projectedMarginPct)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
          <p className="mt-2 text-xs text-muted">
            Formación y revisión por delegación (renglón aparte): tope {fmtMoney(r.tracking.trainingCap)}, real{' '}
            {fmtMoney(r.tracking.trainingCost)}; con su costo, el margen proyectado sería {fmtPct(r.tracking.marginWithTrainingPct)}.
          </p>
        </div>
      </section>

      <section>
        <SectionTitle>Avance por hito</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[60rem] text-sm [&_td]:whitespace-nowrap">
            <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                {['Hito o tramo', 'Planeadas', 'A la fecha', 'Ganadas', '% plan', '% real', 'Contra plan', 'Reales', 'Por terminar', 'Planeada', 'Prevista', 'Real', 'Desv.', 'Para corregir', 'Retrabajo'].map(
                  (h, i) => (
                    <th key={h} className={cx('px-2 py-2', i > 0 && 'text-right')}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="num">
              {r.segments.map((s) => (
                <tr key={s.segmentId} className="border-t border-rule">
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{s.name}</td>
                  <td className="px-3 py-2 text-right">{fmtHours(s.plannedHours)}</td>
                  <td className="px-3 py-2 text-right">{fmtHours(s.plannedToDate)}</td>
                  <td className="px-3 py-2 text-right">{fmtHours(s.earned)}</td>
                  <td className="px-3 py-2 text-right">{fmtPct(s.plannedPct)}</td>
                  <td className="px-3 py-2 text-right">{fmtPct(s.earnedPct)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtIndex(s.vsPlan)}</td>
                  <td className="px-3 py-2 text-right">{fmtHours(s.realHours)}</td>
                  <td className="px-3 py-2 text-right">{fmtHours(s.remaining)}</td>
                  <td className="px-3 py-2 text-right">{fmtDate(s.plannedDelivery)}</td>
                  <td className="px-3 py-2 text-right">{fmtDate(s.forecastDelivery)}</td>
                  <td className="px-3 py-2 text-right">{fmtDate(s.actualDelivery)}</td>
                  <td className="px-3 py-2 text-right">{s.deviation ?? ''}</td>
                  <td className="px-3 py-2 text-right">{fmtHours(s.correctionBudget)}</td>
                  <td className="px-3 py-2 text-right">{fmtPct(s.rework)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <details className="group">
          <summary className="cursor-pointer list-none">
            <SectionTitle aside={<span className="text-sm font-semibold text-accent group-open:hidden">Ver</span>}>
              De dónde sale cada cifra
            </SectionTitle>
          </summary>
          <Card className="divide-y divide-rule text-sm">
            {[
              ['Horas de clase planeada', fmtHours(r.figures.plannedClassHours), 'Bitácora, fechadas hasta el corte, sin formación'],
              ['Horas de clase corrección', fmtHours(r.figures.correctionHours), 'Alimenta el retrabajo'],
              ['Horas de clase ajuste menor', fmtHours(r.figures.minorAdjustmentHours), 'Bajan la bolsa'],
              ['Horas de clase imprevisto', fmtHours(r.figures.unplannedHours), 'Bajan la reserva'],
              ['Horas reales al corte', fmtHours(r.figures.realHours), 'Las cuatro clases; sin formación'],
              ['Horas de formación (aparte)', fmtHours(r.figures.trainingHours), 'No entran a la eficiencia ni a la calibración'],
              ['Reserva usada', `${fmtHours(r.figures.reserveUsed)} (${fmtPct(r.figures.reserveUsedPct)})`, 'Imprevisto + corrección con garantía + corrección que pasa de lo planeado para corregir'],
              ['Bolsa usada', `${fmtHours(r.figures.poolUsed)} (${fmtPct(r.figures.poolUsedPct)})`, `Ajustes menores + cambios cubiertos con la bolsa · ${r.figures.poolWarning}`],
              ['Avance ganado', fmtHours(r.figures.earned), 'Actividades al 100 % con fecha real y de revisión hasta el corte'],
              ['Valor planeado', fmtHours(r.figures.plannedValue), 'Actividades con fecha planeada hasta el corte'],
              ['Pendiente reestimado', fmtHours(r.figures.pendingReestimated), 'Horas por terminar de lo no terminado + cambios aprobados que faltan en el desglose'],
              ['Estimado de lo que falta', fmtHours(r.figures.estimateToComplete), `Pendiente + saldos de reserva y bolsa (${fmtHours(r.figures.balancesToAdd)})`],
              ['Costo real de horas', fmtMoney(r.figures.realHoursCost), 'Horas × costo de quien las hizo'],
              ['Gastos directos pagados', fmtMoney(r.figures.directCostsPaid), 'Bitácora, gasto directo'],
              ['Costo real menos cobrado', fmtMoney(r.figures.realCostMinusCollected), `Cobrado: ${fmtMoney(r.figures.collected)}`],
              ['Defectos: cliente / revisión interna', `${r.figures.clientDefects} / ${r.figures.internalDefects}`, 'Cambios de tipo defecto · desglose con revisión hasta el corte'],
              ['Cambios de alcance', `${r.figures.scopeChanges} · ${fmtMoney(r.figures.approvedChangesAmount)}`, `${fmtHours(r.figures.unbilledHours)} h no cobradas`],
            ].map(([a, b, c]) => (
              <div key={a} className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-2 sm:grid-cols-[16rem_8rem_1fr]">
                <div className="font-semibold">{a}</div>
                <div className="num text-right font-bold">{b}</div>
                <div className="col-span-2 text-xs text-muted sm:col-span-1">{c}</div>
              </div>
            ))}
          </Card>
        </details>
      </section>
    </div>
  )
}

function IndicatorCard({ i }: { i: Indicator }) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-ink2">
          {i.number != null && <span className="mr-1 text-accent">{i.number}.</span>}
          {i.label}
        </div>
        <LightBadge light={i.light} size="sm" />
      </div>
      <div className={cx('num mt-1 text-3xl font-extrabold tracking-tight', i.value == null && 'text-muted')}>{fmtIndicator(i)}</div>
      <div className="mt-1 text-xs text-muted">{i.detail}</div>
      <details className="mt-auto pt-3 text-xs">
        <summary className="cursor-pointer font-semibold text-accent">
          Amarillo: {i.yellow || '—'} · Rojo: {i.red || '—'}
        </summary>
        <p className="mt-2 text-ink2">
          <span className="font-semibold">
            {i.frequency} · {i.owner}.
          </span>{' '}
          {i.action}
        </p>
      </details>
    </Card>
  )
}

function Row({ label, h, m, strong, extra }: { label: string; h?: number; m?: number; strong?: boolean; extra?: string }) {
  return (
    <tr className={cx('border-t border-rule', strong && 'font-bold')}>
      <td className="px-3 py-2 font-sans">{label}</td>
      <td className="px-3 py-2 text-right">{h != null ? fmtHours(h) : ''}</td>
      <td className="px-3 py-2 text-right">
        {m != null ? fmtMoney(m) : ''}
        {extra && <span className="ml-2 text-xs font-semibold text-accent-2">{extra}</span>}
      </td>
    </tr>
  )
}

function Track({ label, v, f, strong }: { label: string; v: { planned: number; real: number; toGo: number; projected: number }; f: (x: number) => string; strong?: boolean }) {
  return (
    <tr className={cx('border-t border-rule', strong && 'font-bold')}>
      <td className="px-3 py-2 font-semibold">{label}</td>
      <td className="px-3 py-2 text-right">{f(v.planned)}</td>
      <td className="px-3 py-2 text-right">{f(v.real)}</td>
      <td className="px-3 py-2 text-right">{f(v.toGo)}</td>
      <td className="px-3 py-2 text-right">{f(v.projected)}</td>
    </tr>
  )
}
