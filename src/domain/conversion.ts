/**
 * De la propuesta aceptada al proyecto: tramos, hitos con su pago, desglose con una
 * actividad por unidad (Desglose estándar, «Cómo se usa», paso 5) y parámetros del D11.
 */
import { BASE_HOURS } from './catalogs'
import { CORRECTION_ACTIVITIES, estimate, type Estimate } from './estimating'
import { emptyProject, localId, newWbsItem } from './factory'
import type { BaseHoursTable, Hat, Member, ProjectData, Proposal, Prospect, WbsItem, WbsTemplate } from './types'

export interface ConversionInput {
  proposal: Proposal
  prospect: Prospect
  template: WbsTemplate
  base?: BaseHoursTable
  key: string
  members?: Member[]
  hats?: Hat[]
}

/** Semanas de cada tramo: puerta 3, cada hito y el cierre. */
export function weeksPerSegment(weeks: number, milestones: number, followWeeks: number): number[] {
  const n = Math.max(1, milestones)
  const p3 = weeks <= 6 ? 1 : 2
  const last = Math.max(0, Math.min(followWeeks, weeks - p3 - n))
  const build = Math.max(n, weeks - p3 - last)
  const per = Array.from({ length: n }, (_, i) => Math.floor(build / n) + (i < build % n ? 1 : 0))
  return [p3, ...per, last]
}

export function projectFromProposal(input: ConversionInput): { data: ProjectData; estimate: Estimate } {
  const { proposal: pr, prospect, template } = input
  const base = input.base ?? BASE_HOURS
  const est = estimate({
    template,
    units: pr.units,
    size: pr.size,
    base,
    hourlyCost: pr.hourlyCost,
    reservePct: pr.reservePct,
    poolPct: pr.poolPct,
    directCosts: pr.directCosts,
    targetMargin: pr.targetMargin,
    rowOverrides: pr.rowOverrides,
    price: pr.price,
  })
  const n = Math.max(1, pr.units.milestones)
  const data = emptyProject({ key: input.key, name: pr.name, client: prospect.company })
  data.segments = [
    { id: localId('seg'), position: 1, name: 'Hasta la puerta 3' },
    ...Array.from({ length: n }, (_, i) => ({ id: localId('seg'), position: i + 2, name: `Hito ${i + 1}` })),
    { id: localId('seg'), position: n + 2, name: 'Acompañamiento y cierre' },
  ]
  const segId = (i: number) => data.segments[Math.max(0, Math.min(n + 1, i))].id
  const milestonePayments = pr.payments.slice(1)
  data.milestones = Array.from({ length: n }, (_, i) => ({
    id: localId('ms'),
    segmentId: segId(i + 1),
    key: `H${i + 1}`,
    title: '',
    paymentAmount: milestonePayments[i]?.amount ?? null,
    plannedDelivery: null,
    forecastDelivery: null,
    actualDelivery: null,
    actaDate: null,
    deviationCause: null,
    clientRating: null,
    result: '',
    criterion: '',
  }))
  if (input.members?.length) {
    data.members = input.members.map((m) => ({ ...m, id: localId('mem') }))
    const idMap = new Map(input.members.map((m, i) => [m.id, data.members[i].id]))
    if (input.hats?.length)
      data.hats = input.hats.map((h) => ({
        ...h,
        id: localId('hat'),
        holderId: h.holderId ? (idMap.get(h.holderId) ?? null) : null,
        backupId: h.backupId ? (idMap.get(h.backupId) ?? null) : null,
      }))
  }
  const holder = (hat: string) => data.hats.find((h) => h.hat === hat)?.holderId ?? null

  const weeks = weeksPerSegment(pr.units.weeks, n, pr.units.followWeeks)
  const weekSegment: number[] = []
  weeks.forEach((count, seg) => {
    for (let i = 0; i < count; i++) weekSegment.push(seg)
  })

  // Claves [tramo].[entregable]-A[nn]
  const delivIndex = new Map<string, number>()
  const actCounter = new Map<string, number>()
  const nextKey = (seg: number, deliverable: string) => {
    const dk = `${seg}|${deliverable}`
    if (!delivIndex.has(dk)) delivIndex.set(dk, [...delivIndex.keys()].filter((k) => k.startsWith(`${seg}|`)).length + 1)
    const d = delivIndex.get(dk)!
    const c = (actCounter.get(dk) ?? 0) + 1
    actCounter.set(dk, c)
    return `${seg}.${d}-A${String(c).padStart(2, '0')}`
  }

  const items: WbsItem[] = []
  const push = (seg: number, line: Estimate['lines'][number], name: string, hours: number) => {
    items.push(
      newWbsItem({
        position: items.length + 1,
        key: nextKey(seg, line.row.deliverable),
        name,
        segmentId: segId(seg),
        deliverable: line.row.deliverable,
        block: line.row.block,
        activityType: line.row.activityType,
        level: line.row.level,
        ownerId: holder(line.row.hat),
        estimatedHours: Math.round(hours * 10) / 10,
        remainingHours: Math.round(hours * 10) / 10,
        correctionBudget: CORRECTION_ACTIVITIES.has(line.row.activity),
      }),
    )
  }

  for (const line of est.lines) {
    if (line.hours <= 0) continue
    const r = line.row
    const fixedSeg = r.segment === 'p3' || r.segment === 'running' ? 0 : r.segment === 'last' ? n + 1 : 1
    if (r.fixed || !r.unit) {
      push(fixedSeg, line, r.activity, line.hours)
      continue
    }
    const units = Math.max(0, Math.round(line.units))
    if (!units) continue
    const per = line.hours / units
    // Unidades chicas (menos de 2 horas) van juntas en una actividad.
    if (per < 2 && r.unit !== 'weeks') {
      push(r.segment === 'last' ? n + 1 : r.segment === 'p3' ? 0 : 1, line, r.activity, line.hours)
      continue
    }
    for (let u = 0; u < units; u++) {
      let seg: number
      let name = units > 1 ? `${r.activity} ${u + 1}` : r.activity
      if (r.unit === 'weeks') {
        seg = weekSegment[u] ?? n
        name = `Semana ${u + 1}: ${r.activity.charAt(0).toLowerCase()}${r.activity.slice(1)}`
      } else if (r.unit === 'invoices') {
        seg = u === 0 ? 0 : Math.min(n, u)
        name = u === 0 ? `${r.activity}: pago inicial` : `${r.activity}: Hito ${Math.min(n, u)}`
      } else if (r.unit === 'milestones') {
        seg = Math.min(n, u + 1)
        name = `${r.activity}: Hito ${seg}`
      } else if (r.segment === 'p3') seg = 0
      else if (r.segment === 'last') seg = n + 1
      else seg = 1 + (u % n)
      push(seg, line, name, per)
    }
  }
  data.wbs = items

  const p = data.project.params
  data.project.params = {
    ...p,
    price: est.price,
    initialPayment: pr.payments[0]?.amount ?? null,
    estHourlyCost: pr.hourlyCost,
    reservePct: pr.reservePct,
    poolPct: pr.poolPct,
    directCostsBudget: pr.directCosts,
    expectedMargin: est.marginPct,
    monthlyFee: pr.monthlyFee,
    monthlyPoolHours: pr.monthlyPoolHours,
  }
  data.project.budgetVersion = 'v0'
  data.invoices = pr.payments.map((pay, i) => ({
    id: localId('inv'),
    position: i + 1,
    concept: i === 0 ? 'initial' : 'milestone',
    description: i === 0 ? `Pago inicial: ${pay.trigger.toLowerCase()}` : `${pay.label}`,
    amount: pay.amount,
    purchaseOrder: '',
    invoiceDate: null,
    paidDate: null,
  }))
  return { data, estimate: est }
}
