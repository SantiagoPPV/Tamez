import type {
  ChangeRequest,
  ClientContact,
  ClientPending,
  Decision,
  Hat,
  Invoice,
  Member,
  Milestone,
  Project,
  ProjectData,
  Risk,
  Segment,
  WbsItem,
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
}
export type EntityName = keyof EntityMap

/** Bitácoras: ningún renglón se borra; el folio sale del consecutivo. */
export const LOG_ENTITIES = ['workLogs', 'decisions', 'changes', 'risks'] as const satisfies readonly EntityName[]
export type LogEntity = (typeof LOG_ENTITIES)[number]
export const isLogEntity = (e: EntityName): e is LogEntity => (LOG_ENTITIES as readonly string[]).includes(e)

export interface ProjectSummary {
  id: string
  key: string
  name: string
  client: string
  cutoffDate: string | null
}

export interface Repository {
  readonly mode: 'demo' | 'supabase'
  listProjects(): Promise<ProjectSummary[]>
  loadProject(id: string): Promise<ProjectData>
  /** Crea un proyecto completo (en blanco o con datos, como CE-INV). Devuelve su id. */
  createProject(data: ProjectData): Promise<string>
  updateProject(project: Project): Promise<void>
  deleteProject(id: string): Promise<void>
  /** Inserta o actualiza un renglón. En bitácoras, seq = 0 pide el siguiente folio. */
  save<E extends EntityName>(projectId: string, entity: E, row: EntityMap[E]): Promise<EntityMap[E]>
  remove(projectId: string, entity: EntityName, id: string): Promise<void>
}

export class DataError extends Error {
  constructor(
    message: string,
    readonly code: 'missing_schema' | 'not_staff' | 'network' | 'conflict' | 'other' = 'other',
  ) {
    super(message)
  }
}
