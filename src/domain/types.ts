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
export type Channel = 'meeting' | 'email' | 'whatsapp'
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
}

/** Tramo del proyecto: «Hasta la puerta 3», «Hito 1»… (orden = position). */
export interface Segment {
  id: string
  position: number
  name: string
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
}

/** Persona del despacho en el proyecto, con su costo por hora. */
export interface Member {
  id: string
  name: string
  hourlyCost: number | null
  weeklyHours: number | null
  /** Usuario de Supabase Auth ligado a esta persona (si existe). */
  userId?: string | null
}

export interface ClientContact {
  id: string
  name: string
  role: string
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
}

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
}
