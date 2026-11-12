import type { ISODate } from './dates'

/* ---------------------------------------------------------------------------
 * Catálogos (códigos en inglés; etiquetas en español en catalogs.ts)
 * ------------------------------------------------------------------------- */
export type RowClass = 'deliverable' | 'activity' | 'subactivity'
export type ActivityType =
  | 'screen'
  | 'integration'
  | 'database'
  | 'report'
  | 'data_load'
  | 'release'
  | 'document'
export type Level = 'simple' | 'medium' | 'complex' | 'own'
export type ActivityStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type HourClass = 'planned' | 'correction' | 'minor_adjustment' | 'unplanned'
export type HourMark = 'training' | 'warranty'
export type Channel = 'meeting' | 'email' | 'whatsapp' | 'portal' | 'phone'
export type RequestKind = 'defect' | 'minor_adjustment' | 'scope_change'
export type Billing = 'yes' | 'pool' | 'defect'
export type RequestStatus =
  | 'in_review'
  | 'waiting_client'
  | 'approved'
  | 'rejected'
  | 'in_baseline'
  | 'done'
export type RiskClass = 'risk' | 'incident'
export type Severity = 'high' | 'medium' | 'low'
export type DependsOn = 'us' | 'client'
export type RiskStatus = 'open' | 'in_progress' | 'closed'
export type DeviationCause = 'ours' | 'client'
export type InvoiceConcept = 'initial' | 'milestone' | 'scope_change' | 'monthly'
export type HatName =
  | 'sales'
  | 'project_lead'
  | 'analysis'
  | 'architecture'
  | 'construction'
  | 'quality'
  | 'administration'
  | 'support'
export type HatLevel = 'observes' | 'full_review' | 'gate_review' | 'autonomous' | 'na'
export type Light = 'green' | 'yellow' | 'red' | 'none'

/* ---------------------------------------------------------------------------
 * Parámetros del proyecto (bloque 1 de la hoja). Todo valor de negocio es un
 * parámetro con su valor inicial (defaults.ts); la minuta puede cambiarlos.
 * ------------------------------------------------------------------------- */
export interface Params {
  /** B14 Precio sin IVA */
  price: number | null
  /** B15 Pago inicial sin IVA */
  initialPayment: number | null
  /** B17 Costo por hora para estimar lo que falta */
  estHourlyCost: number | null
  /** B18 Reserva para imprevistos (fracción) */
  reservePct: number
  /** B19 Bolsa de ajustes (fracción) */
  poolPct: number
  /** B20 Gastos directos presupuestados */
  directCostsBudget: number | null
  /** B21 Margen mínimo (fracción); null = por definir */
  minMargin: number | null
  /** B22 Plazo de revisión del cliente (días hábiles) */
  clientReviewDays: number
  /** B23 Plazo para verificar correcciones (días hábiles) */
  fixVerifyDays: number
  /** B24 Días de crédito (naturales) */
  creditDays: number | null
  /** B25 Días en que recibe facturas */
  invoiceReception: string
  /** B26 Documentos que pide para pagar */
  paymentDocuments: string
  /** B27 Garantía (días naturales tras la aceptación) */
  warrantyDays: number
  /** B28 Tope de horas por actividad */
  maxActivityHours: number
  /** B29 Horas desde las que un ajuste es cambio de alcance */
  scopeChangeFromHours: number
  /** B30 Aviso de uso de bolsa y reserva (fracción) */
  usageWarningPct: number
  /** B31 Tope de horas de formación (fracción de las horas planeadas) */
  trainingCapPct: number
  /** B32 Decimales de los índices */
  indexDecimals: number
  /* Umbrales del semáforo (B34 a B51) */
  progressYellow: number
  progressRed: number
  efficiencyYellow: number
  efficiencyRed: number
  marginDropYellow: number
  marginDropRedNoMin: number
  overdueYellowCount: number
  overdueRedDays: number
  deviationYellowDays: number
  deviationRedDays: number
  reworkYellow: number
  reworkRed: number
  clientDefectsYellow: number
  clientDefectsRed: number
  acceptYellowDays: number
  satisfactionYellow: number
  satisfactionRed: number
  collectRedDays: number
  /** M7 Tope de horas por persona por semana */
  weeklyHoursCap: number
  /** M8 Días naturales de una semana */
  daysPerWeek: number
  /** M9 Eficiencia por tipo: fuera de rango arriba de */
  efficiencyUpper: number
  /** M12 Pausa del siguiente hito por factura vencida (días hábiles) */
  pauseAfterOverdueDays: number
  /* Servicio mensual (Procedimientos, 6; D08 y D09) */
  /** Mensualidad sin IVA */
  monthlyFee: number | null
  /** Arranque de la mensualidad */
  serviceStart: string | null
  /** Bolsa de horas del mes */
  monthlyPoolHours: number
  /** Qué pasa con las horas no usadas */
  unusedHoursRule: string
  /** Urgente: primera respuesta en horario hábil (horas) */
  urgentResponseHours: number
  /** Urgente: primera respuesta fuera de horario (horas) */
  urgentResponseOffHours: number
  /** Urgente: solución o forma temporal de operar (horas) */
  urgentSolutionHours: number
  /** Normal: primera respuesta (días hábiles) */
  normalResponseDays: number
  /** Normal: solución (días hábiles) */
  normalSolutionDays: number
  /** Margen esperado con que se cotizó (fracción) */
  expectedMargin: number | null
}

/* ---------------------------------------------------------------------------
 * Entidades
 * ------------------------------------------------------------------------- */
export interface Project {
  id: string
  key: string
  name: string
  client: string
  budgetVersion: string
  startDate: ISODate | null
  /** Fecha de corte; null = hoy */
  cutoffDate: ISODate | null
  /** M10 Horas de la línea base firmada */
  baselineHours: number | null
  /** M11 Fecha de firma de la línea base */
  baselineSignedOn: ISODate | null
  nonWorkingDays: ISODate[]
  params: Params
  /**
   * Lo que se captura una vez y usan todos los documentos: datos de facturación del cliente,
   * objetivo, alcance, supuestos, restricciones… (campos y listas de las plantillas).
   */
  facts?: DocData
}

/** Tramo del proyecto: «Hasta la puerta 3», «Hito 1»… (orden = position). */
export interface Segment {
  id: string
  position: number
  name: string
  /** Nombre para el cliente (p. ej. «Diagnóstico» para «Hasta la puerta 3») */
  title?: string
  result?: string
  criterion?: string
}

/** Fila de hito del Desglose. */
export interface Milestone {
  id: string
  segmentId: string
  key: string
  title: string
  paymentAmount: number | null
  plannedDelivery: ISODate | null
  forecastDelivery: ISODate | null
  actualDelivery: ISODate | null
  actaDate: ISODate | null
  deviationCause: DeviationCause | null
  clientRating: number | null
  /** Resultado del hito en palabras del cliente (D01, D02) */
  result?: string
  /** Cómo se comprueba (D02) */
  criterion?: string
  /** Comentario del cliente al aceptar (portal o D07) */
  clientComment?: string
}

/** Persona del despacho en el proyecto, con su costo por hora. */
export interface Member {
  id: string
  name: string
  hourlyCost: number | null
  weeklyHours: number | null
  position?: string
  email?: string
  phone?: string
  /** Usuario de Supabase Auth ligado a esta persona (si existe). */
  userId?: string | null
}

/** Papel del cliente (Sombreros, «Papeles del lado del cliente»). */
export type ClientRole = 'decides' | 'responsible' | 'systems' | 'billing' | 'tester' | 'other'

export interface ClientContact {
  id: string
  name: string
  /** Papel en texto libre, como lo escribe la hoja */
  role: string
  roleKey?: ClientRole | null
  position?: string
  email?: string
  phone?: string
}

/** Entregable, actividad o subactividad del Desglose. */
export interface WbsItem {
  id: string
  position: number
  rowClass: RowClass
  key: string
  name: string
  segmentId: string | null
  deliverable: string
  /** Bloque del desglose estándar, 1 a 9 */
  block: number | null
  activityType: ActivityType | null
  level: Level | null
  ownerId: string | null
  estimatedHours: number | null
  plannedDate: ISODate | null
  remainingHours: number | null
  forecastDate: ISODate | null
  status: ActivityStatus | null
  /** Lista completa: true = Sí, false = No, null = vacío */
  checklistComplete: boolean | null
  /** Casillas palomeadas de la lista de su tipo (índices como texto) */
  checklist: string[]
  evidence: string
  reviewerId: string | null
  reviewDate: ISODate | null
  internalDefects: number | null
  actualEndDate: ISODate | null
  /** AL: horas planeadas para corregir */
  correctionBudget: boolean
  /** AM: folio del cambio de alcance que agregó este renglón */
  changeFolio: string | null
}

export interface WorkLog {
  id: string
  seq: number
  date: ISODate
  personId: string | null
  activityKey: string
  description: string
  hours: number | null
  hourClass: HourClass | null
  mark: HourMark | null
  relatedFolio: string | null
  directCost: number | null
  evidence: string
  blocker: string
}

export interface Decision {
  id: string
  seq: number
  date: ISODate
  decision: string
  decidedBy: string
  why: string
  discarded: string
  recordedIn: string
}

export interface ChangeRequest {
  id: string
  seq: number
  date: ISODate
  channel: Channel | null
  requestedById: string | null
  description: string
  kind: RequestKind | null
  hours: number | null
  amount: number | null
  segmentId: string | null
  businessDaysMoved: number | null
  billing: Billing | null
  status: RequestStatus | null
  decidedById: string | null
  responseDate: ISODate | null
  recordedIn: string
  baselineNote: string
  /* Servicio mensual: la solicitud de soporte vive en la misma bitácora de cambios (D13). */
  service?: boolean
  urgency?: Urgency | null
  /** Llegada, primera respuesta y solución (fecha y hora ISO) */
  receivedAt?: string | null
  firstResponseAt?: string | null
  resolvedAt?: string | null
}

export type Urgency = 'urgent' | 'normal'

export interface Risk {
  id: string
  seq: number
  date: ISODate
  riskClass: RiskClass | null
  description: string
  severity: Severity | null
  dependsOn: DependsOn | null
  commitmentDate: ISODate | null
  ownerId: string | null
  action: string
  status: RiskStatus | null
  lastReview: ISODate | null
}

export interface ClientPending {
  id: string
  position: number
  description: string
  contactId: string | null
  requestedOn: ISODate | null
  dueOn: ISODate | null
  receivedOn: ISODate | null
  blocksKey: string | null
}

export interface Invoice {
  id: string
  position: number
  concept: InvoiceConcept | null
  description: string
  amount: number | null
  purchaseOrder: string
  invoiceDate: ISODate | null
  paidDate: ISODate | null
}

export interface Hat {
  id: string
  hat: HatName
  holderId: string | null
  level: HatLevel
  backupId: string | null
}

/** Corte semanal pegado como valores (bloque 8). */
export interface WeeklySnapshot {
  id: string
  week: number
  cutoff: ISODate
  values: SnapshotValues
  lights: SnapshotLights
}

export type SnapshotValue = number | 'Sin dato' | string
export type SnapshotValues = Record<SnapshotKey, SnapshotValue>
export type SnapshotLights = Partial<Record<SnapshotKey, Light>>
export type SnapshotKey =
  | 'progress'
  | 'efficiency'
  | 'margin'
  | 'overdue'
  | 'deviation'
  | 'rework'
  | 'clientDefects'
  | 'daysToAccept'
  | 'satisfaction'
  | 'daysToCollect'
  | 'scopeChanges'
  | 'reserveBalance'
  | 'poolBalance'
  | 'general'
  | 'realHours'
  | 'estimateToComplete'
  | 'projectedCost'

/* ---------------------------------------------------------------------------
 * Versión 1, completa: puertas y criterios de aceptación
 * ------------------------------------------------------------------------- */
export type GateNumber = 1 | 2 | 3 | 4 | 5

export interface Gate {
  id: string
  gate: GateNumber
  /** La puerta 4 se repite por hito */
  milestoneId: string | null
  /** Casillas palomeadas (índices como texto) */
  checklist: string[]
  requestedOn: ISODate | null
  approvedById: string | null
  approvedOn: ISODate | null
  notes: string
}

export type CriterionResult = 'pass' | 'fail'
export type CriterionClass = 'none' | 'defect' | 'minor_adjustment' | 'scope_change'

/** Criterio de aceptación (CA-1.3-01): se escribe en D04 y se prueba en el guion de D07. */
export interface AcceptanceCriterion {
  id: string
  milestoneId: string
  code: string
  deliverable: string
  /** Qué hace el usuario */
  action: string
  /** Resultado esperado */
  expected: string
  result: CriterionResult | null
  obtained: string
  evidence: string
  classification: CriterionClass | null
  note: string
}

/* ---------------------------------------------------------------------------
 * Versión 2: documentos
 * ------------------------------------------------------------------------- */
export type DocumentCode =
  | 'D01'
  | 'D02'
  | 'D03'
  | 'D04'
  | 'D05'
  | 'D06'
  | 'D07'
  | 'D08'
  | 'D09'
  | 'D10'
  | 'D11'
  | 'D12'
  | 'D13'
  | 'D14'
export type DocumentStatus = 'draft' | 'sent' | 'signed'

/** Lo que llena una plantilla: campos sueltos y renglones de cada lista. */
export interface DocData {
  fields: Record<string, string>
  lists: Record<string, Record<string, string>[]>
}

/** De qué trata un documento: hito, cambio, semana, mes o propuesta. */
export interface DocContext {
  milestoneId?: string | null
  changeId?: string | null
  /** Fecha de corte (D06) */
  cutoff?: ISODate | null
  week?: number | null
  /** Mes «AAAA-MM» (D09) */
  month?: string | null
  proposalId?: string | null
  /** D01: preliminar o definitiva */
  variant?: 'preliminar' | 'definitiva' | null
}

export interface ProjectDocument {
  id: string
  code: DocumentCode
  version: number
  status: DocumentStatus
  context: DocContext
  /** Lo capturado a mano encima de lo que se llena solo */
  overrides: DocData
  /** Lo que se envió, congelado al enviarlo; null mientras es borrador */
  snapshot: DocData | null
  createdOn: ISODate
  sentOn: ISODate | null
  signedOn: ISODate | null
  notes: string
}

/* ---------------------------------------------------------------------------
 * Versión 3: servicio mensual y portal del cliente
 * ------------------------------------------------------------------------- */
export type RoutineFrequency = 'continuous' | 'daily' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly'

export interface Routine {
  id: string
  name: string
  frequency: RoutineFrequency
  ownerId: string | null
  reviewer: string
  evidenceHint: string
  active: boolean
}

export interface RoutineRun {
  id: string
  routineId: string
  date: ISODate
  done: boolean
  evidence: string
  notes: string
}

/** Usuario del cliente con acceso al portal de este proyecto. */
export interface PortalAccess {
  id: string
  userId: string
  contactId: string | null
  email: string
}

/** Todo lo que vive en un proyecto. */
export interface ProjectData {
  project: Project
  segments: Segment[]
  milestones: Milestone[]
  members: Member[]
  contacts: ClientContact[]
  wbs: WbsItem[]
  workLogs: WorkLog[]
  decisions: Decision[]
  changes: ChangeRequest[]
  risks: Risk[]
  pendings: ClientPending[]
  invoices: Invoice[]
  hats: Hat[]
  snapshots: WeeklySnapshot[]
  gates: Gate[]
  criteria: AcceptanceCriterion[]
  documents: ProjectDocument[]
  routines: Routine[]
  routineRuns: RoutineRun[]
  portalAccess: PortalAccess[]
}

/* ---------------------------------------------------------------------------
 * Versión 4: aprendizaje (fuera de un proyecto)
 * ------------------------------------------------------------------------- */
export type ProspectStage = 'qualify' | 'discovery' | 'feasibility' | 'proposal' | 'won' | 'lost'

export interface Prospect {
  id: string
  company: string
  contactName: string
  contactRole: string
  source: string
  stage: ProspectStage
  /** El problema, en palabras del cliente */
  problem: string
  budget: string
  decisionMaker: string
  decisionDate: ISODate | null
  nextStep: string
  nextStepDate: ISODate | null
  lostReason: string
  projectId: string | null
  createdOn: ISODate
  notes: string
}

export type ProjectSize = 'small' | 'medium' | 'large'

/** Unidades que se cuentan para estimar (Desglose estándar, «Cómo se usa»). */
export interface EstimateUnits {
  weeks: number
  milestones: number
  invoices: number
  sites: number
  groups: number
  technicalRisks: number
  keyScreens: number
  connections: number
  screensSimple: number
  screensMedium: number
  screensComplex: number
  rules: number
  reportsSimple: number
  reportsMedium: number
  reportsComplex: number
  dbChanges: number
  exchangesSimple: number
  exchangesMedium: number
  exchangesComplex: number
  /** Semanas de acompañamiento después de la salida */
  followWeeks: number
}

export interface ProposalPayment {
  label: string
  trigger: string
  amount: number
}

export interface Proposal {
  id: string
  prospectId: string
  name: string
  variant: 'preliminar' | 'definitiva'
  version: number
  date: ISODate
  validUntil: ISODate | null
  templateId: string
  size: ProjectSize
  units: EstimateUnits
  /** Ajustes de horas por renglón del desglose tipo (clave del renglón → horas) */
  rowOverrides: Record<string, number>
  hourlyCost: number
  reservePct: number
  poolPct: number
  directCosts: number
  targetMargin: number
  /** Precio final (redondeado hacia arriba al millar si no se fija a mano) */
  price: number | null
  payments: ProposalPayment[]
  monthlyFee: number | null
  monthlyPoolHours: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  notes: string
}

export type UnitKey = keyof EstimateUnits

/** Renglón de un desglose tipo (Desglose estándar). */
export interface TemplateRow {
  key: string
  block: number
  deliverable: string
  activity: string
  activityType: ActivityType
  level: Level
  hat: HatName
  /** Horas por unidad (o fijas si unit es null) */
  hours: number
  unit: UnitKey | null
  /** «Fija»: solo cambia con el factor del tamaño */
  fixed: boolean
  /** Tramo: 'p3', 'build' (al hito), 'h1', 'last' o 'running' */
  segment: 'p3' | 'build' | 'h1' | 'last' | 'running'
  note: string
}

export interface WbsTemplate {
  id: string
  name: string
  projectClass: string
  description: string
  rows: TemplateRow[]
  builtIn?: boolean
  createdOn: ISODate
}

export type BaseHoursTable = Record<ActivityType, { simple: number; medium: number; complex: number }>

export interface BaseHoursVersion {
  id: string
  version: string
  date: ISODate
  approvedBy: string
  table: BaseHoursTable
  notes: string
}

/** Datos del despacho que llevan los documentos. */
export interface FirmSettings {
  id: string
  name: string
  salesEmail: string
  salesPhone: string
  contactEmail: string
  contactPhone: string
  supportEmail: string
  supportPhone: string
}
