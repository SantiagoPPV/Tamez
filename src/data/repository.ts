import { DEFAULT_PARAMS } from '../domain/defaults'
import type {
  AcceptanceCriterion,
  BaseHoursVersion,
  ChangeRequest,
  ClientContact,
  ClientPending,
  ClientRole,
  Decision,
  FirmSettings,
  Gate,
  Hat,
  Invoice,
  Member,
  Milestone,
  PortalAccess,
  Project,
  ProjectData,
  ProjectDocument,
  Proposal,
  Prospect,
  Risk,
  Routine,
  RoutineRun,
  Segment,
  WbsItem,
  WbsTemplate,
  WeeklySnapshot,
  WorkLog,
} from '../domain/types'

/** Colecciones de un proyecto que se editan renglón por renglón. */
export interface EntityMap {
  segments: Segment
  milestones: Milestone
  members: Member
  contacts: ClientContact
  wbs: WbsItem
  workLogs: WorkLog
  decisions: Decision
  changes: ChangeRequest
  risks: Risk
  pendings: ClientPending
  invoices: Invoice
  hats: Hat
  snapshots: WeeklySnapshot
  gates: Gate
  criteria: AcceptanceCriterion
  documents: ProjectDocument
  routines: Routine
  routineRuns: RoutineRun
  portalAccess: PortalAccess
}
export type EntityName = keyof EntityMap

/** Colecciones fuera de un proyecto (versión 4). */
export interface GlobalMap {
  prospects: Prospect
  proposals: Proposal
  wbsTemplates: WbsTemplate
  baseHours: BaseHoursVersion
}
export type GlobalName = keyof GlobalMap

/** Bitácoras: ningún renglón se borra; el folio sale del consecutivo. */
export const LOG_ENTITIES = ['workLogs', 'decisions', 'changes', 'risks'] as const satisfies readonly EntityName[]
export type LogEntity = (typeof LOG_ENTITIES)[number]
export const isLogEntity = (e: EntityName): e is LogEntity => (LOG_ENTITIES as readonly string[]).includes(e)
/** Registros que tampoco se borran: rutinas hechas. */
export const NO_DELETE = new Set<EntityName>([...LOG_ENTITIES, 'routineRuns'])

export interface ProjectSummary {
  id: string
  key: string
  name: string
  client: string
  cutoffDate: string | null
}

/** Lo que ve el cliente en el portal: solo lo suyo y sin datos internos. */
export interface PortalData {
  data: ProjectData
  me: { contactId: string | null; email: string; roleKey: ClientRole | null }
}

export interface Repository {
  readonly mode: 'demo' | 'supabase'
  listProjects(): Promise<ProjectSummary[]>
  loadProject(id: string): Promise<ProjectData>
  /** Para la calibración entre proyectos. */
  loadAllProjects(): Promise<ProjectData[]>
  /** Crea un proyecto completo (en blanco o con datos, como CE-INV). Devuelve su id. */
  createProject(data: ProjectData): Promise<string>
  updateProject(project: Project): Promise<void>
  deleteProject(id: string): Promise<void>
  /** Inserta o actualiza un renglón. En bitácoras, seq = 0 pide el siguiente folio. */
  save<E extends EntityName>(projectId: string, entity: E, row: EntityMap[E]): Promise<EntityMap[E]>
  remove(projectId: string, entity: EntityName, id: string): Promise<void>
  /* Versión 4 */
  listGlobal<G extends GlobalName>(entity: G): Promise<GlobalMap[G][]>
  saveGlobal<G extends GlobalName>(entity: G, row: GlobalMap[G]): Promise<GlobalMap[G]>
  removeGlobal(entity: GlobalName, id: string): Promise<void>
  getFirm(): Promise<FirmSettings>
  saveFirm(firm: FirmSettings): Promise<void>
  /* Versión 3: portal del cliente */
  portalProjects(): Promise<ProjectSummary[]>
  portalData(projectId: string): Promise<PortalData>
  portalRequest(projectId: string, description: string, service: boolean, urgency: 'urgent' | 'normal' | null): Promise<number>
  portalAcceptMilestone(projectId: string, milestoneId: string, rating: number, comment: string): Promise<void>
  portalDecideChange(projectId: string, changeId: string, approve: boolean): Promise<void>
}

export class DataError extends Error {
  constructor(
    message: string,
    readonly code: 'missing_schema' | 'not_staff' | 'network' | 'conflict' | 'other' = 'other',
  ) {
    super(message)
  }
}

export const EMPTY_FIRM: FirmSettings = {
  id: 'firm',
  name: 'Sistemas a la medida',
  salesEmail: '',
  salesPhone: '',
  contactEmail: '',
  contactPhone: '',
  supportEmail: '',
  supportPhone: '',
}

/** Completa lo que falte (datos guardados con una versión anterior o filas sin columnas nuevas). */
export function normalizeProject(d: Partial<ProjectData> & { project: Project }): ProjectData {
  const arr = <T>(x: T[] | undefined | null) => (Array.isArray(x) ? x : [])
  return {
    project: {
      ...d.project,
      nonWorkingDays: arr(d.project.nonWorkingDays),
      params: { ...DEFAULT_PARAMS, ...(d.project.params ?? {}) },
      facts: {
        fields: { ...(d.project.facts?.fields ?? {}) },
        lists: { ...(d.project.facts?.lists ?? {}) },
      },
    },
    segments: arr(d.segments),
    milestones: arr(d.milestones),
    members: arr(d.members),
    contacts: arr(d.contacts),
    wbs: arr(d.wbs).map((w) => ({ ...w, checklist: arr(w.checklist) })),
    workLogs: arr(d.workLogs),
    decisions: arr(d.decisions),
    changes: arr(d.changes),
    risks: arr(d.risks),
    pendings: arr(d.pendings),
    invoices: arr(d.invoices),
    hats: arr(d.hats),
    snapshots: arr(d.snapshots),
    gates: arr(d.gates).map((g) => ({ ...g, checklist: arr(g.checklist) })),
    criteria: arr(d.criteria),
    documents: arr(d.documents).map((x) => ({
      ...x,
      context: x.context ?? {},
      overrides: { fields: x.overrides?.fields ?? {}, lists: x.overrides?.lists ?? {} },
    })),
    routines: arr(d.routines),
    routineRuns: arr(d.routineRuns),
    portalAccess: arr(d.portalAccess),
  }
}
