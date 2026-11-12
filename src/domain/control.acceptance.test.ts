/**
 * Prueba de aceptación de la versión 1 (Traspaso, sección 5.4; ESPEC.md, sección 4.9):
 * el ejemplo CE-INV al corte del viernes 12/02/2027 tiene que dar exactamente estas cifras.
 */
import { describe, expect, it } from 'vitest'
import { buildCeInv } from '../data/ceinv'
import { computeControl } from './control'

const r = computeControl(buildCeInv(), '2027-02-12')
const ind = (k: string) => r.indicators.find((i) => i.key === k)!
const seg = (name: string) => r.segments.find((s) => s.name === name)!

describe('Prueba de aceptación CE-INV al 12/02/2027', () => {
  it('horas planeadas por tramo: 73 / 115 / 95 / 107 / 30 = 420', () => {
    expect(r.segments.map((s) => s.plannedHours)).toEqual([73, 115, 95, 107, 30])
    expect(r.budget.plannedHours).toBe(420)
  })

  it('reserva 63 h y bolsa 34 h; 517 presupuestadas', () => {
    expect(r.budget.reserveHours).toBe(63)
    expect(r.budget.poolHours).toBe(34)
    expect(r.budget.budgetedHours).toBe(517)
  })

  it('costo total $276,500; precio $330,000; margen $53,500 (16.2 %); alerta en 11.2 %', () => {
    expect(r.budget.plannedCost).toBe(210_000)
    expect(r.budget.reserveCost).toBe(31_500)
    expect(r.budget.poolCost).toBe(17_000)
    expect(r.budget.hoursCost).toBe(258_500)
    expect(r.budget.totalCost).toBe(276_500)
    expect(r.budget.currentPrice).toBe(330_000)
    expect(r.budget.expectedMargin).toBe(53_500)
    expect(r.budget.expectedMarginPct).toBeCloseTo(0.1621, 4)
    expect(r.budget.marginAlertPct).toBeCloseTo(0.1121, 4)
    expect(r.budget.minMarginCheck).toBe('Margen mínimo por definir')
  })

  it('comprobaciones del bloque 1', () => {
    expect(r.paymentsSum).toBe(330_000)
    expect(r.paymentsCheck).toBe('Cuadra con el precio')
    expect(r.baselineCheck).toBe('Cuadra con el Desglose')
  })

  it('horas reales al corte: 199 (184.5 planeada, 2.5 corrección, 3 ajuste menor, 9 imprevisto)', () => {
    expect(r.figures.realHours).toBe(199)
    expect(r.figures.plannedClassHours).toBe(184.5)
    expect(r.figures.correctionHours).toBe(2.5)
    expect(r.figures.minorAdjustmentHours).toBe(3)
    expect(r.figures.unplannedHours).toBe(9)
    expect(r.figures.trainingHours).toBe(12)
  })

  it('avance ganado 179 y valor planeado 188: avance contra plan 0.95', () => {
    expect(r.figures.earned).toBe(179)
    expect(r.figures.plannedValue).toBe(188)
    expect(r.figures.pendingPlanned).toBe(241)
    expect(ind('progress').value).toBe(0.95)
  })

  it('eficiencia de horas 179 / 199 = 0.90', () => {
    expect(ind('efficiency').value).toBe(0.9)
  })

  it('estimado de lo que falta: 250 + 54 + 31 = 335', () => {
    expect(r.figures.pendingReestimated).toBe(250)
    expect(r.figures.reserveBalance).toBe(54)
    expect(r.figures.poolBalance).toBe(31)
    expect(r.figures.balancesToAdd).toBe(85)
    expect(r.figures.estimateToComplete).toBe(335)
  })

  it('proyección al cierre: 534 horas y $285,000', () => {
    expect(r.figures.projectedHours).toBe(534)
    expect(r.tracking.hours).toEqual({ planned: 517, real: 199, toGo: 335, projected: 534 })
    expect(r.tracking.hoursCost).toEqual({ planned: 258_500, real: 99_500, toGo: 167_500, projected: 267_000 })
    expect(r.tracking.directCosts).toEqual({ planned: 18_000, real: 6_000, toGo: 12_000, projected: 18_000 })
    expect(r.tracking.totalCost).toEqual({ planned: 276_500, real: 105_500, toGo: 179_500, projected: 285_000 })
  })

  it('margen proyectado $45,000 (13.6 %), 2.6 puntos bajo el esperado', () => {
    expect(r.tracking.projectedMargin).toBe(45_000)
    expect(r.tracking.projectedMarginPct).toBeCloseTo(0.1364, 4)
    expect(r.tracking.marginDiff).toBeCloseTo(-0.0258, 4)
    expect(ind('margin').value).toBeCloseTo(0.1364, 4)
  })

  it('reserva usada 9 h y bolsa usada 3 h', () => {
    expect(r.figures.reserveUsed).toBe(9)
    expect(r.figures.reserveUsedPct).toBeCloseTo(0.1429, 4)
    expect(r.figures.poolUsed).toBe(3)
    expect(r.figures.poolUsedPct).toBeCloseTo(0.0882, 4)
    expect(r.figures.poolWarning).toBe('Sin aviso')
  })

  it('gastos directos $6,000 de $18,000; cobrado $40,000; costo real menos cobrado $65,500', () => {
    expect(r.figures.directCostsPaid).toBe(6_000)
    expect(r.figures.realHoursCost).toBe(99_500)
    expect(r.figures.realCost).toBe(105_500)
    expect(r.figures.collected).toBe(40_000)
    expect(r.figures.realCostMinusCollected).toBe(65_500)
    expect(r.billing).toEqual({ invoiced: 40_000, collected: 40_000, receivable: 0, overdueInvoices: 0 })
  })

  it('defectos de revisión interna registrados: 13; del cliente: 0', () => {
    expect(r.figures.internalDefects).toBe(13)
    expect(r.figures.clientDefects).toBe(0)
    expect(r.figures.scopeChanges).toBe(0)
    expect(r.figures.approvedChangesAmount).toBe(0)
    expect(r.figures.unbilledHours).toBe(0)
  })

  it('semáforos de los indicadores 1 a 5 y general: verde', () => {
    for (const k of ['progress', 'efficiency', 'margin', 'overdue', 'deviation']) {
      expect(ind(k).light, k).toBe('green')
    }
    expect(r.generalLight).toBe('green')
  })

  it('resto del tablero (bloque 5)', () => {
    expect(ind('overdue').value).toBe(0)
    expect(ind('deviation').value).toBe(0)
    expect(ind('rework').value).toBeCloseTo(0.0126, 4)
    expect(ind('rework').light).toBe('green')
    expect(ind('clientDefects').value).toBe(0)
    expect(ind('clientDefects').light).toBe('green')
    expect(ind('daysToAccept').value).toBe(0)
    expect(ind('daysToAccept').light).toBe('green')
    expect(ind('satisfaction').value).toBeNull()
    expect(ind('satisfaction').light).toBe('none')
    expect(ind('daysToCollect').value).toBe(14)
    expect(ind('daysToCollect').light).toBe('green')
    expect(ind('scopeChanges').value).toBe(0)
    expect(ind('scopeChanges').light).toBe('green')
    expect(ind('reserveBalance').value).toBe(54)
    expect(ind('reserveBalance').light).toBe('green')
    expect(ind('poolBalance').value).toBe(31)
    expect(ind('poolBalance').light).toBe('green')
  })

  it('formación en renglón aparte: 12 h, $6,000, tope $21,000 (42 h), margen con su costo 11.8 %', () => {
    expect(r.tracking.trainingCap).toBe(21_000)
    expect(r.tracking.trainingCost).toBe(6_000)
    expect(r.tracking.marginWithTrainingPct).toBeCloseTo(0.1182, 4)
    expect(ind('training').light).toBe('green')
  })

  it('avance por hito (bloque 6)', () => {
    const rows = r.segments.map((s) => [s.plannedHours, s.plannedToDate, s.earned, s.realHours, s.remaining, s.correctionBudget])
    expect(rows).toEqual([
      [73, 73, 73, 69, 0, 0],
      [115, 99, 98, 117.5, 17, 3],
      [95, 16, 8, 12.5, 92, 3],
      [107, 0, 0, 0, 111, 3],
      [30, 0, 0, 0, 30, 12],
    ])
    expect(seg('Hito 1').vsPlan).toBe(0.99)
    expect(seg('Hito 2').vsPlan).toBe(0.5)
    expect(seg('Hito 3').vsPlan).toBeNull()
    expect(seg('Hito 1').correctionHours).toBe(2.5)
    expect(seg('Hito 1').correctionToReserve).toBe(0)
    expect(seg('Hito 1').rework).toBeCloseTo(0.0213, 4)
    expect(seg('Hito 1').deviation).toBe(0)
    expect(seg('Hito 2').deviation).toBe(0)
    expect(seg('Acompañamiento y cierre').deviation).toBeNull()
  })

  it('filas de hito: H1 entregado el día del corte, sin acta', () => {
    const data = buildCeInv()
    const h1 = r.milestones.get(data.milestones.find((m) => m.key === 'H1')!.id)!
    expect(h1.acceptanceDeadline).toBe('2027-02-23')
    expect(h1.deviation).toBe(0)
    expect(h1.daysToAccept).toBe(0)
    expect(h1.clientDelayDays).toBe(0)
    expect(h1.minForecast).toBe('2027-02-12')
    for (const m of r.milestones.values()) expect(m.alert).toBe('')
  })

  it('ninguna alerta en Desglose, Bitácora, Cambios y Riesgos', () => {
    expect([...r.wbs.values()].filter((w) => w.alert)).toEqual([])
    expect([...r.workLogs.values()].filter((w) => w.alert)).toEqual([])
    expect([...r.changes.values()].map((c) => c.alert)).toEqual(['', ''])
    expect([...r.risks.values()].map((x) => x.alert)).toEqual(['', '', '', '', '', ''])
  })

  it('totales por renglón: Σ retrabajo 2.5; Σ planeada sin formación 184.5; Σ reales 199; Σ reserva 9; Σ bolsa 3', () => {
    const w = [...r.wbs.values()]
    expect(w.reduce((s, x) => s + (x.rework ?? 0), 0)).toBe(2.5)
    expect(w.reduce((s, x) => s + (x.plannedClassHours ?? 0), 0)).toBe(184.5)
    expect(w.reduce((s, x) => s + (x.totalRealHours ?? 0), 0)).toBe(199)
    const l = [...r.workLogs.values()]
    expect(l.reduce((s, x) => s + (x.reserveHours ?? 0), 0)).toBe(9)
    expect(l.reduce((s, x) => s + (x.poolHours ?? 0), 0)).toBe(3)
    expect(l.reduce((s, x) => s + (x.cost ?? 0), 0)).toBe(105_500)
  })

  it('folios y horas de cambios y riesgos', () => {
    expect([...r.changes.values()].map((c) => [c.folio, c.realHours, c.unbilledHours, c.poolHours, c.approvedAmount])).toEqual([
      ['C-01', 1.5, 0, 0, 0],
      ['C-02', 1.5, 0, 0, 0],
    ])
    expect([...r.risks.values()].map((x) => [x.folio, x.reserveHours])).toEqual([
      ['R-01', 0],
      ['R-02', 0],
      ['R-03', 5],
      ['R-04', 4],
      ['R-05', 0],
      ['R-06', 0],
    ])
  })

  it('cobranza: pago inicial cobrado en 14 días, a tiempo', () => {
    const data = buildCeInv()
    const inv = data.invoices.map((i) => r.invoices.get(i.id)!)
    expect(inv.map((i) => i.status)).toEqual(['Cobrada', 'Por facturar', 'Por facturar', 'Por facturar'])
    expect(inv[0].daysToCollect).toBe(14)
    expect(inv[0].businessDaysLate).toBe(0)
  })

  it('carga por persona: rojo en las semanas 2 a 5', () => {
    expect(r.weeklyLoad.slice(2, 6).map((w) => w.light)).toEqual(['red', 'red', 'red', 'red'])
  })

  it('calibración: pantallas 33 h estimadas, 41 reales, 0.80 fuera de rango', () => {
    const screen = r.calibration.find((c) => c.activityType === 'screen')!
    expect([screen.estimated, screen.real, screen.efficiency]).toEqual([33, 41, 0.8])
    expect(screen.advice).toMatch(/^Fuera de rango/)
  })

  it('el corte de la semana 5 coincide con lo que se pegó el 12/02/2027', () => {
    const data = buildCeInv()
    const week5 = data.snapshots.find((s) => s.week === 5)!
    for (const [k, v] of Object.entries(week5.values)) {
      const got = r.snapshot.values[k as keyof typeof week5.values]
      if (typeof v === 'number') expect(got as number, k).toBeCloseTo(v, 4)
      else expect(got, k).toBe(v)
    }
    expect(r.snapshot.lights).toEqual(week5.lights)
  })
})

describe('Cortes pegados de las semanas 1 a 4', () => {
  // Margen, estimado y proyección se pegaron con las horas por terminar de antes de la
  // reestimación del 12/02/2027 (DE-07): no se pueden reproducir con los datos de hoy.
  const fixed = [
    'progress', 'efficiency', 'overdue', 'deviation', 'rework', 'clientDefects', 'daysToAccept',
    'satisfaction', 'daysToCollect', 'scopeChanges', 'reserveBalance', 'poolBalance', 'general', 'realHours',
  ] as const
  for (const snap of buildCeInv().snapshots.filter((s) => s.week < 5)) {
    it(`semana ${snap.week} (${snap.cutoff})`, () => {
      const rw = computeControl(buildCeInv(), snap.cutoff)
      for (const k of fixed) {
        const want = snap.values[k]
        const got = rw.snapshot.values[k]
        if (typeof want === 'number') expect(got as number, k).toBeCloseTo(want, 4)
        else expect(got, k).toBe(want)
        if (k in snap.lights) expect(rw.snapshot.lights[k], `semáforo ${k}`).toBe(snap.lights[k])
      }
    })
  }
})
