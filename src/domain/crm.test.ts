import { describe, expect, it } from 'vitest'
import { buildCeInv, buildDemoProposals, buildDemoProspects, DEMO_FIRM } from '../data/ceinv'
import { BASE_HOURS } from './catalogs'
import { projectFromProspect } from './conversion'
import {
  companySize,
  contentToDoc,
  currentStep,
  feasibilityCheck,
  funnel,
  meetsMinimum,
  monthlyAmount,
  nextAction,
  normalizeProspect,
  stepDone,
  stepStates,
  suggestKey,
} from './crm'
import { STANDARD_TEMPLATE } from './estimating'
import { effectiveStage, planningSteps, stageAfterChange, stageFromData, startSteps } from './stage'
import type { Gate, ProjectData, Prospect } from './types'

const prospects = () => buildDemoProspects().map(normalizeProspect)
const byId = (id: string) => prospects().find((p) => p.id === id)!

describe('CRM: reglas del Excel de consultoría', () => {
  it('mínimo de venta: 30,000 pesos por mes de creación', () => {
    // CE-INV: 330,000 en 13 semanas (3 meses) deja 110,000 por mes.
    expect(monthlyAmount(330000, 13)).toEqual({ months: 3, perMonth: 110000 })
    expect(meetsMinimum(330000, 13)).toBe(true)
    // El taller de la demostración: 40,000 en 6 semanas queda bajo el mínimo.
    expect(monthlyAmount(40000, 6).perMonth).toBe(28889)
    expect(meetsMinimum(40000, 6)).toBe(false)
    // Un proyecto corto está bien si respeta el monto mensual.
    expect(meetsMinimum(45000, 4)).toBe(true)
    expect(meetsMinimum(null, 10)).toBeNull()
  })

  it('tamaño de la empresa por número de empleados', () => {
    expect(companySize(8)).toBe('micro')
    expect(companySize(50)).toBe('small')
    expect(companySize(180)).toBe('medium')
    expect(companySize(900)).toBe('large')
    expect(companySize(null)).toBeNull()
    expect(companySize(40, { micro: 5, small: 30, medium: 100 })).toBe('medium')
  })

  it('los estados de antes pasan a los del CRM', () => {
    const old = { ...byId('pros-2'), stage: 'proposal' } as unknown as Prospect
    expect(normalizeProspect(old).stage).toBe('feasible')
    expect(normalizeProspect({ ...old, stage: 'won' } as unknown as Prospect).stage).toBe('client')
    expect(normalizeProspect({ ...old, stage: 'qualify' } as unknown as Prospect).stage).toBe('initial')
  })

  it('cada prospecto de la demostración está en su paso', () => {
    const proposals = buildDemoProposals()
    const ctx = (id: string) => ({ prospect: byId(id), proposals: proposals.filter((p) => p.prospectId === id) })
    expect(currentStep(ctx('pros-3'))).toBe('descubrimiento')
    expect(currentStep(ctx('pros-2'))).toBe('factibilidad')
    expect(currentStep(ctx('pros-4'))).toBe('propuesta')
    expect(nextAction(ctx('pros-4'))?.text).toBe('Validación de dirección general pendiente')
    expect(currentStep(ctx('pros-ceinv'))).toBeNull()
    expect(stepStates(ctx('pros-2')).descubrimiento).toBe('done')
    expect(stepStates(ctx('pros-2')).factibilidad).toBe('current')
  })

  it('la factibilidad exige los criterios obligatorios en «sí»', () => {
    const p = byId('pros-2')
    expect(feasibilityCheck(p.feasibility, DEMO_FIRM).ok).toBe(false)
    const answers = Object.fromEntries(['podemos', 'conviene', 'rentable', 'minimo'].map((k) => [k, { value: 'yes' as const, note: '' }]))
    expect(feasibilityCheck({ ...p.feasibility!, answers }, DEMO_FIRM)).toEqual({ ok: true, missing: [] })
    expect(feasibilityCheck({ ...p.feasibility!, answers: { ...answers, minimo: { value: 'no', note: '' } } }, DEMO_FIRM).missing).toHaveLength(1)
  })

  it('la medición dice dónde se caen los prospectos', () => {
    const f = funnel(buildDemoProspects(), buildDemoProposals())
    expect(f.total).toBe(6)
    expect(f.byStage).toEqual({ initial: 2, feasible: 1, confirmed: 0, client: 1, lost: 2 })
    expect(f.lostByStep.factibilidad).toBe(1)
    expect(f.lostByStep.seguimiento).toBe(1)
    expect(f.lostByCategory.not_feasible).toBe(1)
    expect(f.lostByCategory.no_response).toBe(1)
    // Pasan la factibilidad 3 de 4 analizados.
    expect(f.passRate).toBeCloseTo(0.75)
    expect(f.pipeline).toBe(240000)
  })

  it('el contenido de la propuesta llena las listas de la D01 y la D02', () => {
    const pr = buildDemoProposals()[0]
    const doc = contentToDoc(pr.content, byId('pros-ceinv'))
    expect(doc.fields['proyecto.objetivo']).toMatch(/tiempo real/)
    expect(doc.lists.alcance_incluye).toHaveLength(3)
    expect(doc.lists.resultados[0]).toEqual({ 'resultado.nombre': 'Inventario en tiempo real', 'resultado.comprobacion': 'cada almacén ve sus existencias al momento' })
    expect(doc.lists.pendientes[1]).toEqual({ 'pendiente.tipo': 'Accesos', 'pendiente.que': 'Acceso de pruebas al sistema contable', 'pendiente.quien': 'Iván Torres', 'pendiente.fecha': 'Semana 1' })
    expect(doc.lists.costos_terceros[0]['terceros.quien_paga']).toBe('Su empresa')
    expect(doc.lists.problema_frases[0]['problema.quien']).toBe('Ricardo Solís, Director general')
    expect(doc.fields['propuesta.datos']).toMatch(/confidencial/)
  })

  it('la clave sugerida sale de la empresa y del proyecto', () => {
    expect(suggestKey('Cliente Ejemplo, S.A. de C.V.', 'Control de inventario en almacenes')).toBe('CE-CIA')
  })
})

describe('Del prospecto al cliente', () => {
  const pros = byId('pros-4')
  const proposal = buildDemoProposals().find((p) => p.id === 'pr-4')!
  const base = (): ProjectData =>
    projectFromProspect({ proposal, prospect: pros, template: STANDARD_TEMPLATE, base: BASE_HOURS, key: 'DE-PED', firm: DEMO_FIRM, approvedOn: '2027-02-20', approvedBy: 'Santiago', members: buildCeInv().members, hats: buildCeInv().hats })

  it('la puerta 1 abre el expediente «por arrancar» con todos los datos', () => {
    const d = base()
    expect(d.project.stage).toBe('confirmed')
    expect(d.project.prospectId).toBe('pros-4')
    expect(d.contacts.map((c) => c.roleKey)).toEqual(['decides'])
    expect(d.contacts[0].email).toBe('comercial@ejemplocentro.mx')
    expect(d.gates).toHaveLength(1)
    expect(d.gates[0]).toMatchObject({ gate: 1, approvedOn: '2027-02-20' })
    expect(d.documents.map((x) => x.code)).toEqual(['D01', 'D15', 'D16', 'D02'])
    const acta = d.documents.find((x) => x.code === 'D02')!
    expect(acta.signers?.map((s) => s.kind)).toEqual(['client', 'firm'])
    expect(acta.signers?.[1].email).toBe('socio@sistemasalamedida.mx')
    expect(d.project.facts?.fields['proyecto.objetivo']).toMatch(/celular/)
    expect(d.invoices[0]).toMatchObject({ concept: 'initial', amount: 40000 })
    expect(d.wbs.length).toBeGreaterThan(20)
  })

  it('al cobrar el pago inicial pasa a Cliente en Inicio, y las puertas lo mueven de etapa', () => {
    const d = base()
    expect(stageFromData(d)).toBe('confirmed')
    expect(stageAfterChange(d)).toBeNull()
    d.invoices[0] = { ...d.invoices[0], invoiceDate: '2027-02-21', paidDate: '2027-02-24' }
    expect(stageAfterChange(d)).toBe('start')
    d.project.stage = 'start'
    const gate = (n: 2 | 3 | 5): Gate => ({ id: `g${n}`, gate: n, milestoneId: null, checklist: [], requestedOn: null, approvedById: null, approvedOn: '2027-03-01', notes: '' })
    d.gates.push(gate(2))
    expect(stageAfterChange(d)).toBe('planning')
    d.gates.push(gate(3))
    expect(effectiveStage(d)).toBe('execution')
    d.milestones = d.milestones.map((m) => ({ ...m, actaDate: '2027-04-30' }))
    expect(effectiveStage(d)).toBe('closing')
    d.gates.push(gate(5))
    expect(effectiveStage(d)).toBe('service')
    d.project.params = { ...d.project.params, monthlyFee: null }
    expect(effectiveStage(d)).toBe('closed')
  })

  it('una etapa guardada no retrocede sola', () => {
    const d = base()
    d.project.stage = 'execution'
    expect(effectiveStage(d)).toBe('execution')
    d.project.stage = 'cancelled'
    expect(effectiveStage(d)).toBe('cancelled')
  })

  it('CE-INV, de antes del CRM, queda en Ejecución', () => {
    const d = buildCeInv()
    expect(effectiveStage(d)).toBe('execution')
    const start = startSteps(d, '/crm/pros-ceinv')
    expect(start.find((s) => s.id === 'cobro')?.done).toBe(true)
    expect(start.find((s) => s.id === 'papeleo')?.done).toBe(true)
    const plan = planningSteps(d)
    expect(plan.find((s) => s.id === 'definitiva')?.done).toBe(true)
    // En CE-INV solo el Hito 1 trae criterios de aceptación: el alcance definitivo sigue pendiente.
    expect(plan.find((s) => s.id === 'alcance')?.done).toBe(d.milestones.every((m) => d.criteria.some((c) => c.milestoneId === m.id)))
    expect(plan.find((s) => s.id === 'diagnostico')?.done).toBe(false)
  })

  it('el paso de cobro se cumple con el pago inicial cobrado', () => {
    const d = base()
    const ctx = { prospect: { ...pros, stage: 'confirmed' as const }, proposals: [proposal], project: d }
    expect(stepDone('cobro', ctx)).toBe(false)
    d.invoices[0].paidDate = '2027-02-24'
    expect(stepDone('cobro', ctx)).toBe(true)
    expect(stepDone('cierre', ctx)).toBe(false)
  })
})
