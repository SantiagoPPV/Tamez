import { describe, expect, it } from 'vitest'
import { buildCeInv, buildDemoProposals, buildDemoProspects } from '../data/ceinv'
import { BASE_HOURS } from './catalogs'
import { computeControl } from './control'
import { projectFromProposal, weeksPerSegment } from './conversion'
import { CEINV_UNITS, STANDARD_TEMPLATE, estimate, suggestPayments, suggestSize } from './estimating'
import { gateRows } from './gates'
import { calibrationSamples, proposeBaseHours } from './learning'
import { BusinessCalendar } from './dates'
import { businessMinutes, clockMinutes, expectedRuns, monthlyService, requestTiming } from './service'
import type { ChangeRequest } from './types'

const base = {
  template: STANDARD_TEMPLATE,
  units: CEINV_UNITS,
  size: 'medium' as const,
  base: BASE_HOURS,
  hourlyCost: 500,
  reservePct: 0.15,
  poolPct: 0.08,
  directCosts: 18000,
  targetMargin: 0.16,
}

describe('Estimación con el desglose estándar (versión 4)', () => {
  const e = estimate(base)
  it('CE-INV: 87 + 62 + 24 + 103 + 28 + 17 + 39 + 40 + 20 = 420 horas; 97 fijas', () => {
    expect(e.byBlock.map((b) => b.hours)).toEqual([87, 62, 24, 103, 28, 17, 39, 40, 20])
    expect(e.activityHours).toBe(420)
    expect(e.fixedHours).toBe(97)
  })
  it('De las horas al precio: 517 horas, $276,500 de costo y $330,000 de precio (redondeado al millar)', () => {
    expect([e.reserveHours, e.poolHours, e.budgetedHours]).toEqual([63, 34, 517])
    expect(e.totalCost).toBe(276500)
    expect(e.suggestedPrice).toBe(330000)
    expect(e.marginPct).toBeCloseTo(0.1621, 4)
    expect(Math.round(e.changeRate!)).toBe(786)
  })
  it('el factor del tamaño solo mueve los renglones fijos', () => {
    const small = estimate({ ...base, size: 'small' })
    expect(small.fixedHours).toBeCloseTo(97 * 0.6, 1)
    expect(small.activityHours).toBeCloseTo(420 - 97 + 97 * 0.6, 1)
  })
  it('sugiere el tamaño con el mayor de sitios, hitos, pantallas y conexiones', () => {
    expect(suggestSize(CEINV_UNITS)).toBe('medium')
    expect(suggestSize({ ...CEINV_UNITS, connections: 3 })).toBe('large')
  })
  it('los pagos sugeridos suman el precio y el inicial cubre el costo hasta la puerta 3', () => {
    const pays = suggestPayments(e, 3, 500)
    expect(pays.reduce((s, p) => s + p.amount, 0)).toBe(330000)
    expect(pays[0].amount).toBeGreaterThanOrEqual(73 * 500)
    expect(pays).toHaveLength(4)
  })
})

describe('De la propuesta al proyecto', () => {
  const [proposal] = buildDemoProposals()
  const prospect = buildDemoProspects()[0]
  const { data } = projectFromProposal({ proposal, prospect, template: STANDARD_TEMPLATE, key: 'CE-NEW' })
  it('crea los cinco tramos, tres hitos con su pago y el desglose de 420 horas', () => {
    expect(data.segments.map((s) => s.name)).toEqual(['Hasta la puerta 3', 'Hito 1', 'Hito 2', 'Hito 3', 'Acompañamiento y cierre'])
    expect(data.milestones.map((m) => m.paymentAmount)).toEqual([90000, 90000, 110000])
    const r = computeControl(data, '2027-01-01')
    expect(r.budget.plannedHours).toBe(420)
    expect(r.paymentsCheck).toBe('Cuadra con el precio')
  })
  it('una actividad por unidad, sin pasar de 16 horas, y 21 horas para corregir', () => {
    expect(data.wbs.every((w) => (w.estimatedHours ?? 0) <= 16)).toBe(true)
    expect(data.wbs.filter((w) => w.correctionBudget).reduce((s, w) => s + (w.estimatedHours ?? 0), 0)).toBe(21)
    expect(new Set(data.wbs.map((w) => w.key)).size).toBe(data.wbs.length)
    expect(data.wbs.filter((w) => w.name.startsWith('Semana')).length).toBe(39)
  })
  it('reparte las semanas: 2 hasta la puerta 3, los hitos y 2 de acompañamiento', () => {
    expect(weeksPerSegment(13, 3, 2)).toEqual([2, 3, 3, 3, 2])
  })
})

describe('Calibración con horas reales', () => {
  it('toma solo actividades terminadas de los bloques 4, 5 y 6, sin nivel propio', () => {
    const samples = calibrationSamples([buildCeInv()])
    expect(samples.length).toBeGreaterThan(0)
    expect(samples.every((s) => s.level !== ('own' as never))).toBe(true)
    const screens = samples.filter((s) => s.activityType === 'screen')
    expect(screens.reduce((a, s) => a + s.estimated, 0)).toBe(33)
    expect(screens.reduce((a, s) => a + s.real, 0)).toBe(41)
  })
  it('con menos de cinco actividades no se toca la hora base; con cinco, promedio a media hora', () => {
    const one = proposeBaseHours(
      [{ projectKey: 'X', key: 'a', name: 'a', activityType: 'screen', level: 'medium', estimated: 6, real: 7.4, finishedOn: '2027-01-01' }],
      BASE_HOURS,
    )
    expect(one.find((c) => c.activityType === 'screen' && c.level === 'medium')!.proposed).toBe(6)
    const five = proposeBaseHours(
      [7, 7.4, 6.6, 8, 7].map((real, i) => ({ projectKey: 'X', key: `a${i}`, name: 'a', activityType: 'screen' as const, level: 'medium' as const, estimated: 6, real, finishedOn: '2027-01-01' })),
      BASE_HOURS,
    )
    expect(five.find((c) => c.activityType === 'screen' && c.level === 'medium')!.proposed).toBe(7)
  })
})

describe('Servicio mensual', () => {
  const cal = new BusinessCalendar(['2027-05-05'])
  it('mide minutos de reloj y minutos hábiles (9:00 a 18:00)', () => {
    expect(clockMinutes('2027-05-12T09:20', '2027-05-12T10:00')).toBe(40)
    expect(businessMinutes('2027-05-11T17:00', '2027-05-12T10:00', cal)).toBe(120)
    expect(businessMinutes('2027-05-04T17:00', '2027-05-06T10:00', cal)).toBe(120) // el 5 es inhábil
  })
  it('cuenta las rutinas del mes desde el arranque del servicio', () => {
    const r = { id: 'r', name: 'Respaldos', frequency: 'daily' as const, ownerId: null, reviewer: '', evidenceHint: '', active: true }
    expect(expectedRuns(r, '2027-05-01', '2027-05-31', '2027-04-08')).toBe(31)
    expect(expectedRuns(r, '2027-04-01', '2027-04-30', '2027-04-08')).toBe(23)
    const bi = { ...r, frequency: 'bimonthly' as const }
    expect(expectedRuns(bi, '2027-06-01', '2027-06-30', '2027-04-08')).toBe(1)
    expect(expectedRuns(bi, '2027-05-01', '2027-05-31', '2027-04-08')).toBe(0)
  })
  it('una urgente en horario hábil: respuesta en 10 minutos (compromiso 1 hora) y solución en 40', () => {
    const data = buildCeInv()
    const c: ChangeRequest = {
      ...data.changes[0],
      id: 'svc',
      seq: 26,
      date: '2027-05-12',
      kind: 'defect',
      service: true,
      urgency: 'urgent',
      receivedAt: '2027-05-12T09:20',
      firstResponseAt: '2027-05-12T09:30',
      resolvedAt: '2027-05-12T10:00',
    }
    data.changes.push(c)
    const t = requestTiming(c, data, new BusinessCalendar(data.project.nonWorkingDays))
    expect([t.responseMinutes, t.solutionMinutes, t.responseLimit, t.responseOk, t.solutionOk]).toEqual([10, 40, 60, true, true])
    const m = monthlyService(data, '2027-05')
    expect(m.urgent.received).toBe(1)
    expect(m.pool.total).toBe(8)
  })
  it('la bolsa del mes descuenta ajustes y mejoras, no defectos ni garantía', () => {
    const data = buildCeInv()
    const mk = (seq: number, kind: ChangeRequest['kind']): ChangeRequest => ({ ...data.changes[0], id: `c${seq}`, seq, date: '2027-05-10', kind, service: true, urgency: 'normal', receivedAt: '2027-05-10T10:00' })
    data.changes.push(mk(23, 'minor_adjustment'), mk(24, 'defect'))
    data.workLogs.push(
      { ...data.workLogs[0], id: 'w1', seq: 900, date: '2027-05-11', relatedFolio: 'C-23', hours: 4, hourClass: 'minor_adjustment' },
      { ...data.workLogs[0], id: 'w2', seq: 901, date: '2027-05-12', relatedFolio: 'C-24', hours: 2, hourClass: 'correction' },
    )
    const m = monthlyService(data, '2027-05')
    expect(m.pool.used).toBe(4)
    expect(m.pool.available).toBe(4)
    expect(m.pool.uses.map((u) => u.folio)).toEqual(['C-23'])
  })
})

describe('Puertas', () => {
  it('CE-INV al 12/02: puertas 1 a 3 aprobadas; la del Hito 1 espera el acta', () => {
    const data = buildCeInv()
    const rows = gateRows(data, computeControl(data))
    expect(rows.map((g) => [g.name, g.state])).toEqual([
      ['Propuesta aceptada', 'approved'],
      ['Arranque autorizado', 'approved'],
      ['Línea base firmada', 'approved'],
      ['Hito aceptado: H1', 'pending'],
      ['Hito aceptado: H2', 'pending'],
      ['Hito aceptado: H3', 'pending'],
      ['Proyecto cerrado', 'pending'],
    ])
    const h1 = rows[3]
    expect(h1.hints[0]?.text).toMatch(/Entregado el 12\/02\/2027; el plazo vence el 23\/02\/2027/)
  })
})
