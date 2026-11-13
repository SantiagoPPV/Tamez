/**
 * CRM vinculado a operaciones (Excel de consultoría): estados del prospecto, pasos con su
 * «listo cuando», mínimo de venta mensual, tamaños, medición del embudo y el paso del
 * prospecto al proyecto.
 */
import { CRM_STEPS, DEFAULT_BILLING, GATE_DEFS } from './catalogs'
import { todayInMexico, type ISODate } from './dates'
import { getFormat } from './formats'
import { localId } from './factory'
import type {
  ClosingInfo,
  CrmStep,
  DocData,
  Discovery,
  Feasibility,
  FirmSettings,
  FiscalData,
  Gate1,
  LostCategory,
  ProjectData,
  ProjectDocument,
  Proposal,
  ProposalContent,
  ProposalValidation,
  Prospect,
  ProspectStage,
  SaleInfo,
} from './types'

export const DEFAULT_MIN_MONTHLY = 30000
export const DEFAULT_COMPANY_SIZES = { micro: 10, small: 50, medium: 250 }
export const WEEKS_PER_MONTH = 52 / 12

/* -------------------------------------------------------------- valores ---- */
export const emptyDiscovery = (): Discovery => ({ scheduledAt: null, heldOn: null, recordingUrl: '', transcript: '', summary: '', answers: {}, sentOn: null, aiJobId: null })
export const emptyFeasibility = (): Feasibility => ({ answers: {}, decision: null, decidedOn: null, decidedBy: '', reason: '' })
export const emptySale = (): SaleInfo => ({
  presentation: null,
  presentationOn: null,
  presentedOn: null,
  secondInterview: { required: null, withWhom: '', scheduledOn: null, heldOn: null, notes: '' },
  decision: null,
  decidedOn: null,
})
export const emptyGate1 = (): Gate1 => ({ checklist: [], requestedOn: null, approvedOn: null, approvedBy: '' })
export const emptyContent = (): ProposalContent => ({
  objective: '',
  problem: '',
  approach: '',
  result: '',
  includes: '',
  excludes: '',
  clientNeeds: '',
  dataConfidentiality:
    'Tratamos su información como confidencial: solo la usan las personas del proyecto, no se comparte con terceros y, al terminar, se devuelve o se borra. Si lo requieren, firmamos su acuerdo de confidencialidad.',
  thirdParties: '',
  conditions: '',
})
export const emptyValidation = (): ProposalValidation => ({ requestedOn: null, approvedOn: null, approvedBy: '', changesRequested: '' })
export const emptyFiscal = (): FiscalData => ({ rfc: '', legalName: '', taxSystem: '601', zip: '', cfdiUse: 'G03', emails: '', paymentMethod: 'PPD', paymentForm: '99' })
export const emptyClosing = (): ClosingInfo => ({
  heldOn: null,
  actaReviewed: false,
  startOnPayment: false,
  nda: { status: 'pending', reference: '' },
  vendor: { status: 'pending', reference: '' },
  purchaseOrder: { status: 'pending', reference: '' },
  notes: '',
})

const LEGACY_STAGE: Record<string, ProspectStage> = { qualify: 'initial', discovery: 'initial', feasibility: 'initial', proposal: 'feasible', won: 'client' }

/** Completa lo que falte a un prospecto guardado con una versión anterior. */
export function normalizeProspect(p: Prospect): Prospect {
  const sale = { ...emptySale(), ...(p.sale ?? {}) }
  sale.secondInterview = { ...emptySale().secondInterview, ...(p.sale?.secondInterview ?? {}) }
  return {
    ...p,
    stage: (LEGACY_STAGE[p.stage] ?? p.stage) as ProspectStage,
    contactEmail: p.contactEmail ?? '',
    contactPhone: p.contactPhone ?? '',
    industry: p.industry ?? '',
    companyEmployees: p.companyEmployees ?? null,
    projectUsers: p.projectUsers ?? null,
    decisionMakerRole: p.decisionMakerRole ?? '',
    projectKey: p.projectKey ?? '',
    discovery: { ...emptyDiscovery(), ...(p.discovery ?? {}), answers: { ...(p.discovery?.answers ?? {}) } },
    feasibility: { ...emptyFeasibility(), ...(p.feasibility ?? {}), answers: { ...(p.feasibility?.answers ?? {}) } },
    sale,
    followUps: Array.isArray(p.followUps) ? p.followUps : [],
    lost: p.lost ?? null,
    gate1: { ...emptyGate1(), ...(p.gate1 ?? {}), checklist: Array.isArray(p.gate1?.checklist) ? p.gate1!.checklist : [] },
  }
}

export function normalizeProposal(p: Proposal): Proposal {
  return { ...p, content: { ...emptyContent(), ...(p.content ?? {}) }, validation: { ...emptyValidation(), ...(p.validation ?? {}) } }
}

/* -------------------------------------------------------------- tamaños ---- */
export type CompanySize = 'micro' | 'small' | 'medium' | 'large'
export const COMPANY_SIZE: Record<CompanySize, string> = { micro: 'Micro', small: 'Pequeña', medium: 'Mediana', large: 'Grande' }

export function companySize(employees: number | null | undefined, sizes = DEFAULT_COMPANY_SIZES): CompanySize | null {
  if (employees == null || !(employees > 0)) return null
  if (employees <= sizes.micro) return 'micro'
  if (employees <= sizes.small) return 'small'
  if (employees <= sizes.medium) return 'medium'
  return 'large'
}

/** Tamaño del proyecto sugerido por los empleados que usarían el sistema. */
export function projectSizeByUsers(users: number | null | undefined): 'small' | 'medium' | 'large' | null {
  if (users == null || !(users > 0)) return null
  if (users <= 15) return 'small'
  if (users <= 60) return 'medium'
  return 'large'
}

/* ----------------------------------------------------- mínimo mensual ---- */
/** Monto de venta por mes de creación: precio ÷ meses del proyecto (semanas ÷ 4.33). */
export function monthlyAmount(price: number | null | undefined, weeks: number | null | undefined): { months: number; perMonth: number | null } {
  const w = weeks && weeks > 0 ? weeks : 0
  const months = Math.round((w / WEEKS_PER_MONTH) * 10) / 10
  if (!price || !w) return { months, perMonth: null }
  return { months, perMonth: Math.round(price / (w / WEEKS_PER_MONTH)) }
}

export function meetsMinimum(price: number | null | undefined, weeks: number | null | undefined, min = DEFAULT_MIN_MONTHLY): boolean | null {
  const { perMonth } = monthlyAmount(price, weeks)
  return perMonth == null ? null : perMonth >= min
}

/* --------------------------------------------- contenido de la propuesta ---- */
export const lines = (text: string | null | undefined) =>
  (text ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)

const parts = (line: string) => line.split('|').map((x) => x.trim())

/** Lo que dice la propuesta, como campos y listas de las plantillas D01 y D02. */
export function contentToDoc(content: ProposalContent | undefined, prospect: Pick<Prospect, 'contactName' | 'contactRole' | 'decisionMaker' | 'decisionMakerRole'> | null): DocData {
  const c = { ...emptyContent(), ...(content ?? {}) }
  const fields: Record<string, string> = {}
  const lists: DocData['lists'] = {}
  if (c.objective.trim()) {
    fields['proyecto.objetivo'] = c.objective.trim()
    fields['proyecto.objetivo_portada'] = c.objective.trim()
  }
  const who = prospect ? [prospect.decisionMaker || prospect.contactName, prospect.decisionMakerRole || prospect.contactRole].filter(Boolean).join(', ') : ''
  if (lines(c.problem).length) lists.problema_frases = lines(c.problem).map((l) => ({ 'problema.frase': l.startsWith('«') ? l : `«${l}»`, 'problema.quien': who }))
  if (lines(c.approach).length) lists.como_lo_logramos = lines(c.approach).map((l) => ({ 'paso.texto': l }))
  if (lines(c.result).length)
    lists.resultados = lines(c.result).map((l) => {
      const [name, ...rest] = l.split(':')
      return rest.length ? { 'resultado.nombre': name.trim(), 'resultado.comprobacion': rest.join(':').trim() } : { 'resultado.nombre': l, 'resultado.comprobacion': '' }
    })
  if (lines(c.includes).length) lists.alcance_incluye = lines(c.includes).map((l) => ({ 'alcance.incluye': l }))
  if (lines(c.excludes).length) lists.alcance_no_incluye = lines(c.excludes).map((l) => ({ 'alcance.no_incluye': l }))
  if (lines(c.clientNeeds).length)
    lists.pendientes = lines(c.clientNeeds).map((l) => {
      const [que, quien = '', cuando = ''] = parts(l)
      return { 'pendiente.tipo': /acceso/i.test(que) ? 'Accesos' : 'Información', 'pendiente.que': que, 'pendiente.quien': quien, 'pendiente.fecha': cuando }
    })
  if (lines(c.thirdParties).length)
    lists.costos_terceros = lines(c.thirdParties).map((l) => {
      const [servicio, contrata = 'Su empresa', nombre = 'Su empresa', paga = 'Su empresa'] = parts(l)
      return { 'terceros.servicio': servicio, 'terceros.quien_contrata': contrata, 'terceros.a_nombre_de': nombre, 'terceros.quien_paga': paga }
    })
  if (lines(c.conditions).length) lists.supuestos = lines(c.conditions).map((l) => ({ 'supuesto.hecho': l }))
  if (c.dataConfidentiality.trim()) fields['propuesta.datos'] = c.dataConfidentiality.trim()
  return { fields, lists }
}

/* ----------------------------------------------------------- los pasos ---- */
export interface CrmContext {
  prospect: Prospect
  /** Propuestas de este prospecto */
  proposals: Proposal[]
  /** El proyecto, desde que se aprueba la puerta 1 */
  project?: ProjectData | null
  firm?: FirmSettings | null
}

export const latestProposal = (proposals: Proposal[]) => [...proposals].sort((a, b) => b.version - a.version || b.date.localeCompare(a.date))[0] ?? null

export function feasibilityCheck(f: Feasibility | undefined, firm?: FirmSettings | null): { ok: boolean; missing: string[] } {
  const def = getFormat(firm, 'D16')
  const missing: string[] = []
  for (const s of def.sections)
    for (const q of s.questions) if (q.required && f?.answers[q.id]?.value !== 'yes') missing.push(q.label)
  return { ok: missing.length === 0, missing }
}

export const initialInvoice = (d: ProjectData | null | undefined) => d?.invoices.find((i) => i.concept === 'initial') ?? null

export function closingCheck(d: ProjectData | null | undefined): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  if (!d) return { ok: false, missing: ['El expediente del proyecto'] }
  const c = d.project.closing
  if (!c?.heldOn) missing.push('La fecha de la cita de cierre')
  if (!c?.startOnPayment) missing.push('El acuerdo de que el arranque comienza al recibir el pago')
  if (!d.contacts.some((x) => x.roleKey === 'decides')) missing.push('Quién decide y paga')
  if (!d.contacts.some((x) => x.roleKey === 'responsible')) missing.push('El responsable del cliente')
  if (!d.pendings.length) missing.push('Los accesos e información solicitados, con fecha compromiso')
  for (const [k, label] of [['nda', 'Confidencialidad'], ['vendor', 'Alta de proveedor'], ['purchaseOrder', 'Orden de compra']] as const)
    if (!c || c[k].status === 'pending') missing.push(`${label}: lista o «no aplica»`)
  const fz = d.project.fiscal
  if (!fz?.rfc || !fz.legalName || !fz.zip || !fz.taxSystem) missing.push('Los datos para facturar (RFC, razón social, régimen y código postal)')
  return { ok: missing.length === 0, missing }
}

export function stepDone(step: CrmStep, ctx: CrmContext): boolean {
  const { prospect: p, project: d } = ctx
  const disc = p.discovery ?? emptyDiscovery()
  const sale = p.sale ?? emptySale()
  const pr = latestProposal(ctx.proposals)
  switch (step) {
    case 'alta':
      return Boolean(p.company.trim() && p.contactName.trim() && p.companyEmployees && p.projectUsers && (disc.scheduledAt || disc.heldOn))
    case 'descubrimiento':
      return Boolean(disc.heldOn && disc.summary.trim() && p.problem.trim() && p.decisionMaker.trim())
    case 'factibilidad':
      return p.feasibility?.decision === 'feasible'
    case 'propuesta':
      return Boolean(pr?.validation?.approvedOn && sale.presentedOn)
    case 'segunda':
      return sale.secondInterview.required === false || Boolean(sale.secondInterview.required && sale.secondInterview.heldOn)
    case 'seguimiento':
      return sale.decision === 'yes' && Boolean(p.gate1?.approvedOn)
    case 'acta':
      return Boolean(d?.documents.some((x) => x.code === 'D02' && x.status === 'signed'))
    case 'cierre':
      return closingCheck(d).ok
    case 'cobro':
      return Boolean(initialInvoice(d)?.paidDate)
  }
}

export type StepState = 'done' | 'current' | 'pending'

/** Paso en curso: el primero sin terminar del estado actual (null si ya es cliente o se perdió). */
export function currentStep(ctx: CrmContext): CrmStep | null {
  const st = ctx.prospect.stage
  if (st === 'client' || st === 'lost') return null
  const order = CRM_STEPS.filter((s) => s.status === st)
  return order.find((s) => !stepDone(s.step, ctx))?.step ?? order[order.length - 1]?.step ?? null
}

export function stepStates(ctx: CrmContext): Record<CrmStep, StepState> {
  const cur = currentStep(ctx)
  const out = {} as Record<CrmStep, StepState>
  for (const s of CRM_STEPS) out[s.step] = stepDone(s.step, ctx) ? 'done' : s.step === cur ? 'current' : 'pending'
  return out
}

/** Siguiente paso que conviene atender, con su fecha si la hay. */
export function nextAction(ctx: CrmContext): { text: string; on: ISODate | null } | null {
  const p = ctx.prospect
  if (p.stage === 'lost' || p.stage === 'client') return null
  const step = currentStep(ctx)
  const disc = p.discovery ?? emptyDiscovery()
  const sale = p.sale ?? emptySale()
  const lastFollow = [...(p.followUps ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0]
  const pr = latestProposal(ctx.proposals)
  switch (step) {
    case 'alta':
      return { text: 'Programar la junta de descubrimiento', on: null }
    case 'descubrimiento':
      return { text: disc.heldOn ? 'Completar el resumen del descubrimiento' : 'Tener la junta de descubrimiento', on: disc.scheduledAt ? disc.scheduledAt.slice(0, 10) : null }
    case 'factibilidad':
      return { text: 'Decidir la factibilidad', on: null }
    case 'propuesta':
      if (!pr) return { text: 'Hacer la propuesta preliminar', on: null }
      if (!pr.validation?.requestedOn) return { text: 'Pedir la validación de dirección general', on: null }
      if (!pr.validation.approvedOn) return { text: 'Validación de dirección general pendiente', on: pr.validation.requestedOn }
      return { text: 'Presentar la propuesta', on: sale.presentationOn }
    case 'segunda':
      return { text: sale.secondInterview.required ? 'Tener la segunda entrevista' : 'Decidir si hace falta segunda entrevista', on: sale.secondInterview.scheduledOn }
    case 'seguimiento':
      if (sale.decision === 'yes') return { text: 'Aprobar la puerta 1 (propuesta aceptada)', on: p.gate1?.requestedOn ?? null }
      return { text: 'Dar seguimiento hasta un sí o un no', on: lastFollow?.nextOn ?? null }
    case 'acta':
      return { text: 'Firmar el acta de inicio', on: null }
    case 'cierre':
      return { text: 'Tener la cita de cierre', on: null }
    case 'cobro':
      return { text: 'Facturar y cobrar el pago inicial', on: null }
    default:
      return null
  }
}

/* ---------------------------------------------------------- medición ---- */
export interface Funnel {
  total: number
  active: number
  byStage: Record<ProspectStage, number>
  discoveryHeld: number
  feasibilityDecided: number
  feasible: number
  /** Pasan la factibilidad / decididos */
  passRate: number | null
  presented: number
  won: number
  /** Sí / propuestas presentadas */
  winRate: number | null
  clients: number
  lost: number
  lostByStep: Record<CrmStep, number>
  lostByCategory: Record<LostCategory, number>
  /** Valor de las propuestas en venta (sin perdidos ni clientes) */
  pipeline: number
}

export function funnel(prospects: Prospect[], proposals: Proposal[]): Funnel {
  const byStage = { initial: 0, feasible: 0, confirmed: 0, client: 0, lost: 0 } as Record<ProspectStage, number>
  const lostByStep = Object.fromEntries(CRM_STEPS.map((s) => [s.step, 0])) as Record<CrmStep, number>
  const lostByCategory = { not_feasible: 0, no_budget: 0, competitor: 0, no_response: 0, postponed: 0, not_decider: 0, other: 0 } as Record<LostCategory, number>
  let discoveryHeld = 0,
    feasibilityDecided = 0,
    feasible = 0,
    presented = 0,
    won = 0,
    pipeline = 0
  for (const raw of prospects) {
    const p = normalizeProspect(raw)
    byStage[p.stage]++
    if (p.discovery?.heldOn) discoveryHeld++
    if (p.feasibility?.decision) feasibilityDecided++
    if (p.feasibility?.decision === 'feasible') feasible++
    if (p.sale?.presentedOn) presented++
    if (p.sale?.decision === 'yes' || p.stage === 'confirmed' || p.stage === 'client') won++
    if (p.stage === 'lost' && p.lost) {
      lostByStep[p.lost.step] = (lostByStep[p.lost.step] ?? 0) + 1
      lostByCategory[p.lost.category] = (lostByCategory[p.lost.category] ?? 0) + 1
    }
    if (p.stage === 'feasible' || p.stage === 'initial') pipeline += latestProposal(proposals.filter((x) => x.prospectId === p.id))?.price ?? 0
  }
  return {
    total: prospects.length,
    active: byStage.initial + byStage.feasible + byStage.confirmed,
    byStage,
    discoveryHeld,
    feasibilityDecided,
    feasible,
    passRate: feasibilityDecided ? feasible / feasibilityDecided : null,
    presented,
    won,
    winRate: presented ? Math.min(1, won / presented) : null,
    clients: byStage.client,
    lost: byStage.lost,
    lostByStep,
    lostByCategory,
    pipeline,
  }
}

/** Días desde una fecha hasta hoy (para «días en el paso»). */
export function daysSince(d: ISODate | null | undefined, today = todayInMexico()): number | null {
  if (!d) return null
  return Math.round((Date.parse(today) - Date.parse(d.slice(0, 10))) / 86400000)
}

export const GATE1_ITEMS = GATE_DEFS[1].items

/** Clave sugerida del proyecto: iniciales de la empresa y del proyecto (CE-INV). */
export function suggestKey(company: string, projectName: string): string {
  const ini = (t: string, n: number) =>
    t
      .replace(/,?\s*S\.?\s*A\.?.*$/i, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 || /^[A-Z]/.test(w))
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, n)
  const a = ini(company, 3) || 'CL'
  const b = ini(projectName, 3) || 'PRY'
  return `${a}-${b}`.slice(0, 20)
}

/* --------------------------------------- documentos de los formatos ---- */
/** D15: el resumen de la junta como documento (campos = id de pregunta). */
export function discoveryDocData(p: Prospect): DocData {
  const disc = p.discovery ?? emptyDiscovery()
  return {
    fields: { ...disc.answers, resumen: disc.summary, 'junta.fecha': disc.heldOn ?? '', 'cliente.nombre': p.company },
    lists: {},
  }
}

/** D16: la factibilidad como documento. */
export function feasibilityDocData(p: Prospect, firm: FirmSettings | null | undefined, proposal: Proposal | null): DocData {
  const f = p.feasibility ?? emptyFeasibility()
  const def = getFormat(firm, 'D16')
  const fields: Record<string, string> = {}
  for (const s of def.sections)
    for (const q of s.questions) {
      const a = f.answers[q.id]
      fields[q.id] = a?.value ? { yes: 'Sí', no: 'No', pending: 'Por confirmar' }[a.value] + (a.note ? `. ${a.note}` : '') : ''
    }
  const mm = monthlyAmount(proposal?.price ?? null, proposal?.units.weeks ?? null)
  fields.resumen = [
    f.decision === 'feasible' ? 'Dictamen: factible.' : f.decision === 'not_feasible' ? `Dictamen: no factible. ${f.reason}` : 'Dictamen pendiente.',
    proposal?.price ? `Estimación v0: ${proposal.units.weeks} semanas, precio ${proposal.price.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}${mm.perMonth ? `, ${mm.perMonth.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })} por mes de creación` : ''}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return { fields, lists: {} }
}

/** Un documento de formato ya lleno (para copiarlo al expediente del proyecto). */
export function formatDocument(code: 'D15' | 'D16' | 'D17' | 'D18', data: DocData, sentOn: ISODate | null): ProjectDocument {
  return {
    id: localId('doc'),
    code,
    version: 1,
    status: sentOn ? 'sent' : 'draft',
    context: {},
    overrides: data,
    snapshot: sentOn ? data : null,
    createdOn: todayInMexico(),
    sentOn,
    signedOn: null,
    notes: '',
    signers: [],
  }
}

export { DEFAULT_BILLING }
