/**
 * Las 28 pruebas de humo de ESPEC.md, sección 5: cada una cambia un dato del ejemplo
 * CE-INV y dice qué tiene que resultar.
 *
 * ESPEC.md no trae la última ronda de ajustes del ejemplo; manda construir.py. Las filas
 * que citan las pruebas son las mismas, pero varias claves se renumeraron:
 *   fila 39 = 1.2-A01 (antes 1.3-A02) · fila 44 = 1.3-A01 (antes 1.3-A07)
 *   fila 45 = 1.2-A02 (antes 1.3-A08) · fila 53 = 1.9-A01 (antes 1.8-A01)
 *   fila 69 = 2.3-A01 (antes 2.2-A01)
 * Y la factura del pago inicial es del 07/01 (antes 08/01), lo que mueve la prueba 12.
 */
import { describe, expect, it } from 'vitest'
import { buildCeInv } from '../data/ceinv'
import { computeControl, nextSeq } from './control'
import { emptyProject, newWbsItem, newWorkLog } from './factory'
import type { ChangeRequest, ProjectData, WorkLog } from './types'

const CUT = '2027-02-12'
const S = 'm-santiago'
const SO = 'm-socio'

function data(): ProjectData {
  return buildCeInv()
}
function item(d: ProjectData, key: string) {
  const w = d.wbs.find((x) => x.key === key)
  if (!w) throw new Error(`No existe ${key}`)
  return w
}
function ms(d: ProjectData, key: string) {
  return d.milestones.find((m) => m.key === key)!
}
function addLog(d: ProjectData, partial: Partial<WorkLog> & { date: string }): WorkLog {
  const l = newWorkLog({ seq: nextSeq(d.workLogs), ...partial })
  d.workLogs.push(l)
  return l
}
function addChange(d: ProjectData, partial: Partial<ChangeRequest>): ChangeRequest {
  const c: ChangeRequest = {
    id: `c-new-${d.changes.length + 1}`,
    seq: nextSeq(d.changes),
    date: CUT,
    channel: 'meeting',
    requestedById: 'c-2',
    description: 'Prueba',
    kind: null,
    hours: null,
    amount: null,
    segmentId: null,
    businessDaysMoved: null,
    billing: null,
    status: null,
    decidedById: null,
    responseDate: null,
    recordedIn: '',
    baselineNote: '',
    ...partial,
  }
  d.changes.push(c)
  return c
}
const ind = (r: ReturnType<typeof computeControl>, k: string) => r.indicators.find((i) => i.key === k)!
/** Rutas de todo número no finito (NaN, Infinity) en el resultado. */
function nonFinite(value: unknown, path = '$'): string[] {
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [path]
  if (value instanceof Map) return [...value.entries()].flatMap(([k, v]) => nonFinite(v, `${path}.${String(k)}`))
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => nonFinite(v, `${path}.${k}`))
  return []
}

describe('Pruebas de humo (ESPEC.md §5)', () => {
  it('1. Plantilla en blanco: «Sin dato» y ningún error', () => {
    const d = emptyProject({ key: 'CLAVE' })
    const r = computeControl(d, CUT)
    for (const k of ['progress', 'efficiency', 'margin', 'deviation', 'rework', 'clientDefects', 'daysToAccept', 'satisfaction', 'daysToCollect']) {
      expect(ind(r, k).value, k).toBeNull()
      expect(ind(r, k).light, k).toBe('none')
    }
    expect(r.generalLight).toBe('none')
    expect(ind(r, 'training').light).toBe('none')
    expect(ind(r, 'overdue').light).toBe('green')
    expect(r.baselineCheck).toBe('Se escribe al firmar')
    expect(nonFinite(r)).toEqual([])
  })

  it('2. Imprevisto de 2 h con R-03: reserva 11, eficiencia 0.89 amarilla', () => {
    const d = data()
    addLog(d, { date: CUT, personId: S, activityKey: '1.2-A02', description: 'Prueba', hours: 2, hourClass: 'unplanned', relatedFolio: 'R-03' })
    const r = computeControl(d, CUT)
    expect(r.figures.reserveUsed).toBe(11)
    expect(r.figures.reserveBalance).toBe(52)
    expect(r.figures.realHours).toBe(201)
    expect(r.figures.estimateToComplete).toBe(333)
    expect(r.figures.projectedHours).toBe(534)
    expect(ind(r, 'efficiency').value).toBe(0.89)
    expect(ind(r, 'efficiency').light).toBe('yellow')
  })

  it('3. Terminar 2.3-A01 (fila 69): ganado 183, avance 0.97, por terminar 247', () => {
    const d = data()
    Object.assign(item(d, '2.3-A01'), { checklistComplete: true, reviewerId: SO, reviewDate: CUT, actualEndDate: CUT, status: 'done' })
    const r = computeControl(d, CUT)
    expect(r.figures.earned).toBe(183)
    expect(ind(r, 'progress').value).toBe(0.97)
    expect(r.figures.pendingReestimated).toBe(247)
    expect(r.wbs.get(item(d, '2.3-A01').id)!.progress).toBe(1)
  })

  it('4. 1.2-A01 (fila 39) revisada por su responsable: no cuenta y avisa', () => {
    const d = data()
    item(d, '1.2-A01').reviewerId = S
    const r = computeControl(d, CUT)
    expect(r.figures.earned).toBe(176)
    const c = r.wbs.get(item(d, '1.2-A01').id)!
    expect(c.progress).toBe(0)
    expect(c.alert).toBe('Nadie revisa su propio trabajo')
  })

  it('5. Corrección de 1.5 h en el Hito 1: pasa de las 3 h planeadas y 1.0 va a la reserva', () => {
    const d = data()
    const l = addLog(d, { date: CUT, personId: S, activityKey: '1.3-A01', description: 'Prueba', hours: 1.5, hourClass: 'correction', relatedFolio: 'R-03' })
    const r = computeControl(d, CUT)
    expect(r.workLogs.get(l.id)!.reserveHours).toBe(1)
    expect(r.figures.reserveUsed).toBe(10)
    expect(r.segments.find((s) => s.name === 'Hito 1')!.correctionToReserve).toBe(1)
    expect(ind(r, 'rework').value).toBeCloseTo(4 / 200.5, 10)
  })

  it('6. La misma corrección con marca «Garantía»: todo va a la reserva', () => {
    const d = data()
    const l = addLog(d, { date: CUT, personId: S, activityKey: '1.3-A01', description: 'Prueba', hours: 1.5, hourClass: 'correction', mark: 'warranty', relatedFolio: 'R-03' })
    const r = computeControl(d, CUT)
    expect(r.workLogs.get(l.id)!.reserveHours).toBe(1.5)
    expect(r.figures.reserveUsed).toBe(10.5)
  })

  it('7. Pendiente vencido 4 días hábiles: rojo, y el general amarillo', () => {
    const d = data()
    d.pendings.push({ id: 'p-new', position: 12, description: 'Prueba', contactId: 'c-2', requestedOn: '2027-02-02', dueOn: '2027-02-08', receivedOn: null, blocksKey: null })
    const r = computeControl(d, CUT)
    const p = r.pendings.get('p-new')!
    expect(p.overdueDays).toBe(4)
    expect(p.overdueAtCutoff).toBe(1)
    expect(ind(r, 'overdue').value).toBe(1)
    expect(ind(r, 'overdue').light).toBe('red')
    expect(r.generalLight).toBe('yellow')
  })

  it('8. Ajuste menor de 2 h: es cambio de alcance', () => {
    const d = data()
    const c = addChange(d, { kind: 'minor_adjustment', hours: 2 })
    expect(computeControl(d, CUT).changes.get(c.id)!.alert).toBe('De 2 h o más: es cambio de alcance (D05)')
  })

  it('9. Cambio de alcance cobrado y aprobado: sube el precio y lo que falta', () => {
    const d = data()
    const c = addChange(d, { kind: 'scope_change', hours: 10, amount: 7860, billing: 'yes', status: 'approved', decidedById: 'c-1', responseDate: CUT })
    const r = computeControl(d, CUT)
    const cc = r.changes.get(c.id)!
    expect(cc.folio).toBe('C-03')
    expect(cc.approvedAmount).toBe(7860)
    expect(r.budget.currentPrice).toBe(337_860)
    expect(r.figures.scopeChanges).toBe(1)
    expect(cc.hoursToMove).toBe(10)
    expect(r.figures.pendingReestimated).toBe(260)
    expect(cc.alert).toBe('Aprobado: faltan sus actividades en el Desglose (columna AM)')
  })

  it('10. El mismo cambio en línea base con su actividad en el Desglose', () => {
    const d = data()
    const c = addChange(d, { kind: 'scope_change', hours: 10, amount: 7860, billing: 'yes', status: 'in_baseline', decidedById: 'c-1', responseDate: CUT })
    d.wbs.push(newWbsItem({ position: 999, key: '3.17-A01', name: 'Prueba', segmentId: 'seg-h3', estimatedHours: 10, changeFolio: 'C-03', ownerId: S, correctionBudget: false }))
    const r = computeControl(d, CUT)
    const cc = r.changes.get(c.id)!
    expect(cc.hoursInWbs).toBe(10)
    expect(cc.hoursToMove).toBe(0)
    expect(r.figures.pendingReestimated).toBe(260)
    expect(r.baselineCheck).toBe('Cuadra con el Desglose')
    expect(cc.alert).toBe('')
  })

  it('11. Corte al 05/02/2027: el catálogo vencido recorre el Hito 1', () => {
    const r = computeControl(data(), '2027-02-05')
    expect(r.figures.earned).toBe(136)
    expect(r.figures.plannedValue).toBe(142)
    expect(ind(r, 'progress').value).toBe(0.96)
    expect(r.figures.realHours).toBe(151.5)
    expect(r.figures.reserveUsed).toBe(9)
    expect(r.figures.poolUsed).toBe(0)
    expect(ind(r, 'deviation').value).toBe(1)
  })

  it('12. Sin fecha de cobro del pago inicial: vencida, pausar el siguiente hito', () => {
    const d = data()
    d.invoices[0].paidDate = null
    const r = computeControl(d, CUT)
    const inv = r.invoices.get(d.invoices[0].id)!
    expect(r.billing.collected).toBe(0)
    expect(r.figures.realCostMinusCollected).toBe(105_500)
    // Factura del 07/01 (construir.py): 36 días naturales; vence el 22/01 y van 14 días hábiles
    // de atraso (ESPEC, con factura del 08/01: 35 y 13).
    expect(inv.daysToCollect).toBe(36)
    expect(inv.businessDaysLate).toBe(14)
    expect(ind(r, 'daysToCollect').light).toBe('red')
    expect(inv.status).toBe('Vencida: pausar el siguiente hito')
    expect(r.billing.overdueInvoices).toBe(1)
  })

  it('13. Costo por hora del socio operativo a $600: +37 h × $100', () => {
    const d = data()
    d.members.find((m) => m.id === SO)!.hourlyCost = 600
    expect(computeControl(d, CUT).figures.realHoursCost).toBe(103_200)
  })

  it('14. Clave que no existe en la Bitácora', () => {
    const d = data()
    const l = addLog(d, { date: CUT, personId: S, activityKey: '9.9-A99', description: 'Prueba', hours: 1, hourClass: 'planned' })
    const c = computeControl(d, CUT).workLogs.get(l.id)!
    expect(c.keyMissing).toBe(true)
    expect(c.alert).toBe('Clave no existe')
  })

  it('15. 1.2-A02 (fila 45) con 17 h: pasa del tope y la línea base deja de cuadrar', () => {
    const d = data()
    item(d, '1.2-A02').estimatedHours = 17
    const r = computeControl(d, CUT)
    expect(r.wbs.get(item(d, '1.2-A02').id)!.alert).toBe(
      'Pasa del tope de horas por actividad (Indicadores B28): partir la actividad',
    )
    expect(r.baselineCheck).toBe('La línea base cambió sin cambio de alcance aprobado')
  })

  it('16. Acta del Hito 1 el 18/02 con calificación 8, corte 19/02', () => {
    const d = data()
    Object.assign(ms(d, 'H1'), { clientRating: 8, actaDate: '2027-02-18' })
    const r = computeControl(d, '2027-02-19')
    expect(r.milestones.get(ms(d, 'H1').id)!.daysToAccept).toBe(4)
    expect(ind(r, 'daysToAccept').value).toBe(4)
    expect(ind(r, 'daysToAccept').light).toBe('green')
    expect(ind(r, 'satisfaction').value).toBe(8)
    expect(ind(r, 'satisfaction').light).toBe('yellow')
    const h2 = r.segments.find((s) => s.name === 'Hito 2')!
    expect(h2.plannedToDate).toBe(28)
    expect(h2.plannedPct).toBeCloseTo(0.2947, 4)
  })

  it('17. Revisión después del corte: no cuenta todavía', () => {
    const d = data()
    Object.assign(item(d, '2.3-A01'), { checklistComplete: true, reviewerId: SO, actualEndDate: CUT, reviewDate: '2027-02-16' })
    const r = computeControl(d, CUT)
    const c = r.wbs.get(item(d, '2.3-A01').id)!
    expect(c.finishedOn).toBe('2027-02-16')
    expect(c.progress).toBe(0)
    expect(r.figures.earned).toBe(179)
  })

  it('18. 34 h de formación del socio operativo: renglón aparte, amarillo', () => {
    const d = data()
    for (const hours of [2, 16, 16]) {
      addLog(d, { date: CUT, personId: SO, activityKey: '2.3-A01', description: 'Observación', hours, hourClass: 'planned', mark: 'training' })
    }
    const r = computeControl(d, CUT)
    expect(r.figures.trainingHours).toBe(46)
    expect(r.tracking.trainingCost).toBe(23_000)
    expect(r.figures.realHoursCost).toBe(99_500)
    expect(r.figures.realHours).toBe(199)
    expect(ind(r, 'training').light).toBe('yellow')
  })

  it('19. Sin horas para corregir en el Hito 1 (fila 53)', () => {
    const d = data()
    item(d, '1.9-A01').correctionBudget = false
    const r = computeControl(d, CUT)
    expect(r.segments.find((s) => s.name === 'Hito 1')!.correctionBudget).toBe(0)
    expect(r.milestones.get(ms(d, 'H1').id)!.alert).toBe('Hito sin horas planeadas para corregir (columna AL)')
  })

  it('20. Subactividad de 1.2-A02: el padre pasa a Entregable', () => {
    const d = data()
    d.wbs.push(newWbsItem({ position: 999, rowClass: 'subactivity', key: '1.2-A02.1', name: 'Prueba', segmentId: 'seg-h1', estimatedHours: 6 }))
    const r = computeControl(d, CUT)
    expect(r.wbs.get(item(d, '1.2-A02').id)!.alert).toBe('Tiene subactividades: pásalo a clase Entregable')
    expect(r.wbs.get(item(d, '1.3-A01').id)!.alert).toBe('')
  })

  it('21. Horas con la clave de un hito', () => {
    const d = data()
    const l = addLog(d, { date: CUT, personId: S, activityKey: 'H1', description: 'Prueba', hours: 1, hourClass: 'planned' })
    expect(computeControl(d, CUT).workLogs.get(l.id)!.alert).toBe('La clave no es una actividad')
  })

  it('22. Imprevisto con un folio que no existe', () => {
    const d = data()
    const l = addLog(d, { date: CUT, personId: S, activityKey: '1.2-A02', description: 'Prueba', hours: 1, hourClass: 'unplanned', relatedFolio: 'R-3' })
    expect(computeControl(d, CUT).workLogs.get(l.id)!.alert).toBe('Folio relacionado no existe')
  })

  it('23. Corte al 22/02: el Hito 1 lleva 6 días hábiles sin acta', () => {
    const d = data()
    const r = computeControl(d, '2027-02-22')
    expect(r.milestones.get(ms(d, 'H1').id)!.daysToAccept).toBe(6)
    expect(ind(r, 'daysToAccept').value).toBe(6)
    expect(ind(r, 'daysToAccept').light).toBe('yellow')
  })

  it('24. Corte al 26/02: la cuenta de acceso vencida recorre el Hito 2', () => {
    const d = data()
    const r = computeControl(d, '2027-02-26')
    const acceso = d.pendings.find((p) => p.blocksKey === '2.3-A01')!
    expect(r.pendings.get(acceso.id)!.overdueDays).toBe(3)
    const h2 = r.milestones.get(ms(d, 'H2').id)!
    expect(h2.clientDelayDays).toBe(3)
    expect(h2.minForecast).toBe('2027-03-10')
    expect(h2.deviation).toBe(3)
    expect(ind(r, 'deviation').value).toBe(3)
    expect(ind(r, 'deviation').light).toBe('yellow')
    expect(h2.alert).toBe('Recorrer la fecha prevista: retraso del cliente (causa Cliente)')
  })

  it('25. Renglones sin «qué se hizo» y corrección sin folio después de la entrega', () => {
    const d = data()
    const a = addLog(d, { date: CUT, personId: S, activityKey: '1.2-A02', description: '', hours: 1, hourClass: 'planned' })
    const b = addLog(d, { date: '2027-02-15', personId: S, activityKey: '1.3-A01', description: 'Prueba', hours: 0.5, hourClass: 'correction' })
    const r = computeControl(d, '2027-02-16')
    expect(r.workLogs.get(a.id)!.alert).toBe('Falta qué se hizo')
    expect(r.workLogs.get(b.id)!.alert).toBe('¿Defecto del cliente? Falta folio relacionado')
  })

  it('26. Sin evidencia en los primeros 16 renglones de la Bitácora', () => {
    const d = data()
    for (const l of d.workLogs.filter((x) => x.seq <= 16)) l.evidence = ''
    const r = computeControl(d, CUT)
    expect(r.wbs.get(item(d, '0.5-A01').id)!.alert).toBe('Falta evidencia en la Bitácora')
  })

  it('27. Plantilla: persona sin costo por hora usa el costo para estimar', () => {
    const d = emptyProject({ key: 'CLAVE' })
    d.project.params.estHourlyCost = 500
    d.members.push({ id: 'p1', name: 'Santiago', hourlyCost: null, weeklyHours: null })
    d.wbs.push(newWbsItem({ position: 1, key: '1.1-A01', name: 'Actividad', segmentId: d.segments[1].id, estimatedHours: 4 }))
    const l = addLog(d, { date: CUT, personId: 'p1', activityKey: '1.1-A01', description: 'Prueba', hours: 2, hourClass: 'planned' })
    const r = computeControl(d, CUT)
    expect(r.workLogs.get(l.id)!.cost).toBe(1000)
    expect(r.workLogs.get(l.id)!.alert).toBe('Falta costo por hora de la persona (se usa B17)')
    expect(r.figures.realHoursCost).toBe(1000)
  })

  it('28. (Hoja: solo 16 funciones.) En el software: datos parciales no rompen el cálculo', () => {
    const d = emptyProject()
    d.wbs.push(newWbsItem({ position: 1 }))
    d.workLogs.push(newWorkLog({ seq: 1, date: CUT }))
    d.pendings.push({ id: 'x', position: 1, description: '', contactId: null, requestedOn: null, dueOn: null, receivedOn: null, blocksKey: null })
    d.invoices.push({ id: 'y', position: 1, concept: null, description: '', amount: null, purchaseOrder: '', invoiceDate: null, paidDate: null })
    const r = computeControl(d, CUT)
    expect([...r.workLogs.values()][0].alert).toBe('Faltan datos')
    expect(nonFinite(r)).toEqual([])
  })
})
