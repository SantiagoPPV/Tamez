import { ACTIVITY_TYPE } from '../../domain/catalogs'
import { fmtDate, fmtHours, fmtIndex, fmtInt, fmtMoney, fmtPct } from '../../domain/format'
import type { Light, SnapshotKey, SnapshotLights, SnapshotValues } from '../../domain/types'
import { Card, cx, Empty, LightBadge, SectionTitle } from '../../ui/kit'
import { names, useP } from './ctx'

const COLS: { key: SnapshotKey; label: string; fmt: (v: number) => string }[] = [
  { key: 'progress', label: '1. Avance', fmt: fmtIndex },
  { key: 'efficiency', label: '2. Eficiencia', fmt: fmtIndex },
  { key: 'margin', label: '3. Margen', fmt: fmtPct },
  { key: 'overdue', label: '4. Pend. vencidos', fmt: fmtInt },
  { key: 'deviation', label: '5. Desviación', fmt: fmtInt },
  { key: 'rework', label: '6. Retrabajo', fmt: fmtPct },
  { key: 'clientDefects', label: '7. Def. cliente', fmt: fmtPct },
  { key: 'daysToAccept', label: '8. Días aceptar', fmt: fmtInt },
  { key: 'satisfaction', label: '9. Satisfacción', fmt: fmtInt },
  { key: 'daysToCollect', label: '10. Días cobrar', fmt: fmtInt },
  { key: 'scopeChanges', label: '11. Cambios', fmt: fmtInt },
  { key: 'reserveBalance', label: 'Saldo reserva', fmt: fmtHours },
  { key: 'poolBalance', label: 'Saldo bolsa', fmt: fmtHours },
]

const CELL: Record<Light, string> = {
  green: 'bg-accent-soft/70 text-accent-2',
  yellow: 'bg-ambar-soft text-ambar',
  red: 'bg-rojo-soft text-rojo',
  none: 'text-muted',
}

function SnapRow({ label, cutoff, values, lights, live }: { label: string; cutoff: string; values: SnapshotValues; lights: SnapshotLights; live?: boolean }) {
  const show = (k: SnapshotKey, f: (v: number) => string) => {
    const v = values[k]
    return typeof v === 'number' ? f(v) : (v ?? '')
  }
  return (
    <tr className={cx('border-t border-rule', live && 'bg-surface font-semibold')}>
      <td className="sticky left-0 bg-inherit px-3 py-2 whitespace-nowrap">
        {label}
        <div className="text-xs font-normal text-muted">{fmtDate(cutoff)}</div>
      </td>
      {COLS.map((c) => (
        <td key={c.key} className={cx('num px-2 py-2 text-right whitespace-nowrap', CELL[lights[c.key] ?? 'none'])}>
          {show(c.key, c.fmt)}
        </td>
      ))}
      <td className="px-2 py-2">
        <LightBadge light={(values.general as Light) ?? 'none'} size="sm" />
      </td>
      <td className="num px-2 py-2 text-right">{show('realHours', fmtHours)}</td>
      <td className="num px-2 py-2 text-right">{show('estimateToComplete', fmtHours)}</td>
      <td className="num px-2 py-2 text-right">{show('projectedCost', fmtMoney)}</td>
    </tr>
  )
}

export function WeeksPage() {
  const { data, result } = useP()
  const n = names(data)
  const snaps = [...data.snapshots].sort((a, b) => a.week - b.week)
  const loadWeeks = result.weeklyLoad.filter((w) => w.perPerson.some((p) => p.planned || p.real))

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Seguimiento semanal</SectionTitle>
        <p className="mb-3 text-sm text-ink2">
          Cada viernes, al enviar el reporte, se guarda el corte desde el Tablero: esas filas guardan lo que se reportó y ya no cambian con las reestimaciones.
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[72rem] text-sm">
            <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="sticky left-0 bg-surface px-3 py-2">Semana</th>
                {COLS.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-right">
                    {c.label}
                  </th>
                ))}
                <th className="px-2 py-2">General</th>
                <th className="px-2 py-2 text-right">Horas reales</th>
                <th className="px-2 py-2 text-right">Falta (h)</th>
                <th className="px-2 py-2 text-right">Costo proyectado</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {snaps.map((s) => (
                <SnapRow key={s.id} label={`Semana ${s.week}`} cutoff={s.cutoff} values={s.values} lights={s.lights} />
              ))}
              <SnapRow label="En curso" cutoff={result.cutoff} values={result.snapshot.values} lights={result.snapshot.lights} live />
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <SectionTitle>Carga por persona y semana</SectionTitle>
        <p className="mb-3 text-sm text-ink2">
          Planeadas: horas de las actividades cuya fecha planeada cae en la semana. Reales: todas las horas de la bitácora de la semana, con formación. Rojo:
          alguien pasa el tope de {data.project.params.weeklyHoursCap} h reales. Amarillo: alguien pasa el tope en lo planeado o sus horas comprometidas.
        </p>
        {loadWeeks.length === 0 ? (
          <Empty>Hace falta la fecha de arranque y actividades con responsable.</Empty>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Semana</th>
                  {data.members.map((m) => (
                    <th key={m.id} className="px-3 py-2 text-right">
                      {m.name}
                      <div className="font-normal normal-case tracking-normal">planeadas / reales</div>
                    </th>
                  ))}
                  <th className="px-3 py-2">Semáforo</th>
                </tr>
              </thead>
              <tbody className="num">
                {loadWeeks.map((w) => (
                  <tr key={w.week} className="border-t border-rule">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-semibold">{w.week}</span>{' '}
                      <span className="text-xs text-muted">
                        {fmtDate(w.from)} a {fmtDate(w.to)}
                      </span>
                    </td>
                    {w.perPerson.map((p) => (
                      <td key={p.memberId} className="px-3 py-2 text-right">
                        {fmtHours(p.planned)} / <b>{fmtHours(p.real)}</b>
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <LightBadge light={w.light} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        {data.members.some((m) => m.weeklyHours != null) && (
          <p className="mt-2 text-xs text-muted">
            Horas comprometidas por semana: {data.members.map((m) => `${n.member(m.id)} ${m.weeklyHours ?? '—'}`).join(' · ')}
          </p>
        )}
      </section>

      <section>
        <SectionTitle>Calibración por tipo de actividad</SectionTitle>
        <p className="mb-3 text-sm text-ink2">
          Cuentan las actividades terminadas de los bloques 4, 5 y 6 con nivel distinto de «Propia». Fuera de rango: debajo de{' '}
          {data.project.params.efficiencyYellow} o arriba de {data.project.params.efficiencyUpper}; se anota en D14 y se reestiman sus pendientes.
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2">Tipo de actividad</th>
                <th className="px-3 py-2 text-right">Estimadas de lo terminado</th>
                <th className="px-3 py-2 text-right">Reales (planeada)</th>
                <th className="px-3 py-2 text-right">Eficiencia</th>
                <th className="px-3 py-2">Qué hacer</th>
              </tr>
            </thead>
            <tbody className="num">
              {result.calibration.map((c) => (
                <tr key={c.activityType} className={cx('border-t border-rule', c.activityType === 'total' && 'font-bold')}>
                  <td className="px-3 py-2">{c.activityType === 'total' ? 'Total' : ACTIVITY_TYPE[c.activityType]}</td>
                  <td className="px-3 py-2 text-right">{fmtHours(c.estimated)}</td>
                  <td className="px-3 py-2 text-right">{fmtHours(c.real)}</td>
                  <td className="px-3 py-2 text-right">{fmtIndex(c.efficiency)}</td>
                  <td className={cx('px-3 py-2 font-sans text-xs', c.advice.startsWith('Fuera') && 'font-semibold text-rojo')}>{c.advice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  )
}
