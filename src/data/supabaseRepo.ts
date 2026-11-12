import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { FirmSettings, Project, ProjectData } from '../domain/types'
import { fromPortalRpc } from './portalView'
import {
  DataError,
  EMPTY_FIRM,
  NO_DELETE,
  isLogEntity,
  normalizeProject,
  type EntityMap,
  type EntityName,
  type GlobalMap,
  type GlobalName,
  type PortalData,
  type ProjectSummary,
  type Repository,
} from './repository'

const TABLE: Record<EntityName, string> = {
  segments: 'sam_segments',
  milestones: 'sam_milestones',
  members: 'sam_members',
  contacts: 'sam_contacts',
  wbs: 'sam_wbs_items',
  workLogs: 'sam_work_logs',
  decisions: 'sam_decisions',
  changes: 'sam_changes',
  risks: 'sam_risks',
  pendings: 'sam_pendings',
  invoices: 'sam_invoices',
  hats: 'sam_hats',
  snapshots: 'sam_snapshots',
  gates: 'sam_gates',
  criteria: 'sam_criteria',
  documents: 'sam_documents',
  routines: 'sam_routines',
  routineRuns: 'sam_routine_runs',
  portalAccess: 'sam_portal_access',
}

const GLOBAL_TABLE: Record<GlobalName, string> = {
  prospects: 'sam_prospects',
  proposals: 'sam_proposals',
  wbsTemplates: 'sam_wbs_templates',
  baseHours: 'sam_base_hours',
}

/** Orden de inserción: primero lo que otros renglones referencian. */
const INSERT_ORDER: EntityName[] = [
  'segments',
  'members',
  'contacts',
  'milestones',
  'wbs',
  'workLogs',
  'decisions',
  'changes',
  'risks',
  'pendings',
  'invoices',
  'hats',
  'snapshots',
  'gates',
  'criteria',
  'documents',
  'routines',
  'routineRuns',
  'portalAccess',
]

/** Columnas que no se llaman igual que el campo (palabras reservadas). */
const RENAME: Record<string, string> = { values: 'snapshot_values', lights: 'snapshot_lights', table: 'base_table' }
const UNRENAME = Object.fromEntries(Object.entries(RENAME).map(([k, v]) => [v, k]))
const SERVER_ONLY = new Set(['project_id', 'created_at', 'updated_at', 'created_by'])
/** Campos de fecha y hora: la base los devuelve con segundos. */
const DATETIME = new Set(['receivedAt', 'firstResponseAt', 'resolvedAt'])

const toSnake = (k: string) => RENAME[k] ?? k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const toCamel = (k: string) => UNRENAME[k] ?? k.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase())

export function toRow(obj: object, projectId?: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) out[toSnake(k)] = v
  if (projectId) out.project_id = projectId
  return out
}

export function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (SERVER_ONLY.has(k)) continue
    const key = toCamel(k)
    out[key] = DATETIME.has(key) && typeof v === 'string' ? v.slice(0, 16) : v
  }
  return out as T
}

function fail(error: PostgrestError | null, what: string): never {
  const code = error?.code ?? ''
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST202')
    throw new DataError(
      'La base de datos todavía no tiene las tablas o funciones del software: falta aplicar las migraciones de supabase/migrations.',
      'missing_schema',
    )
  if (code === '42501')
    throw new DataError(error?.message.startsWith('Solo') || error?.message.startsWith('Un cambio') || error?.message.startsWith('Sin acceso') ? error.message : 'Tu usuario no tiene permiso para esto.', 'not_staff')
  if (code === '23505') throw new DataError(`${what}: ya existe un renglón con esa clave o folio.`, 'conflict')
  if (code === '23514' && error?.message.includes('reviewer_not_owner'))
    throw new DataError('Nadie revisa su propio trabajo: quien revisa debe ser otra persona.', 'conflict')
  if (code === '22023') throw new DataError(error!.message)
  throw new DataError(`${what}: ${error?.message ?? 'error desconocido'}`)
}

/** Ids nuevos (uuid) para todo el proyecto, con sus referencias reescritas. */
export function remapIds(data: ProjectData): ProjectData {
  const map = new Map<string, string>()
  const id = (old: string | null | undefined): string | null => {
    if (!old) return null
    if (!map.has(old)) map.set(old, crypto.randomUUID())
    return map.get(old)!
  }
  const ref = (old: string | null | undefined) => (old ? (map.get(old) ?? null) : null)
  const d = structuredClone(data)
  d.project.id = id(d.project.id)!
  for (const name of INSERT_ORDER) for (const row of d[name] as { id: string }[]) row.id = id(row.id)!
  for (const m of d.milestones) m.segmentId = ref(m.segmentId)!
  for (const w of d.wbs) {
    w.segmentId = ref(w.segmentId)
    w.ownerId = ref(w.ownerId)
    w.reviewerId = ref(w.reviewerId)
  }
  for (const l of d.workLogs) l.personId = ref(l.personId)
  for (const c of d.changes) {
    c.requestedById = ref(c.requestedById)
    c.decidedById = ref(c.decidedById)
    c.segmentId = ref(c.segmentId)
  }
  for (const r of d.risks) r.ownerId = ref(r.ownerId)
  for (const p of d.pendings) p.contactId = ref(p.contactId)
  for (const h of d.hats) {
    h.holderId = ref(h.holderId)
    h.backupId = ref(h.backupId)
  }
  for (const m of d.members) m.userId = m.userId ?? null
  for (const g of d.gates) {
    g.milestoneId = ref(g.milestoneId)
    g.approvedById = ref(g.approvedById)
  }
  for (const c of d.criteria) c.milestoneId = ref(c.milestoneId)!
  for (const x of d.documents) {
    // La propuesta vive fuera del proyecto: su id se conserva.
    x.context = { ...x.context, milestoneId: ref(x.context.milestoneId ?? null), changeId: ref(x.context.changeId ?? null) }
  }
  for (const r of d.routines) r.ownerId = ref(r.ownerId)
  for (const r of d.routineRuns) r.routineId = ref(r.routineId)!
  for (const a of d.portalAccess) a.contactId = ref(a.contactId)
  return d
}

/** Inserciones (tabla y renglones) para crear un proyecto completo, en orden. */
export function insertPlan(input: ProjectData): { table: string; rows: Record<string, unknown>[] }[] {
  const data = remapIds(input)
  const plan = [{ table: 'sam_projects', rows: [toRow(data.project)] }]
  for (const name of INSERT_ORDER) {
    const rows = (data[name] as object[]).map((r) => toRow(r, data.project.id))
    if (rows.length) plan.push({ table: TABLE[name], rows })
  }
  return plan
}

export class SupabaseRepository implements Repository {
  readonly mode = 'supabase' as const
  constructor(private readonly db: SupabaseClient) {}

  async whoAmI(): Promise<{ staff: boolean; isAdmin: boolean; name: string | null }> {
    const { data, error } = await this.db.rpc('sam_is_staff')
    if (error) fail(error, 'Comprobar el acceso')
    if (data !== true) return { staff: false, isAdmin: false, name: null }
    const { data: me } = await this.db.from('sam_staff').select('name, is_admin').eq('user_id', (await this.db.auth.getUser()).data.user?.id ?? '').maybeSingle()
    return { staff: true, isAdmin: Boolean(me?.is_admin), name: (me?.name as string) ?? null }
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const { data, error } = await this.db.from('sam_projects').select('id, key, name, client, cutoff_date').order('key')
    if (error) fail(error, 'Leer los proyectos')
    return (data ?? []).map((r) => fromRow<ProjectSummary>(r))
  }

  async loadProject(id: string): Promise<ProjectData> {
    const { data: p, error } = await this.db.from('sam_projects').select('*').eq('id', id).single()
    if (error) fail(error, 'Leer el proyecto')
    const project = fromRow<Project>(p)
    const lists = await Promise.all(
      INSERT_ORDER.map(async (name) => {
        const q = this.db.from(TABLE[name]).select('*').eq('project_id', id)
        const ordered = isLogEntity(name) ? q.order('seq') : name === 'snapshots' ? q.order('week') : q
        const { data, error: e } = await ordered
        if (e) fail(e, `Leer ${name}`)
        return [name, (data ?? []).map((r) => fromRow(r))] as const
      }),
    )
    return normalizeProject({ project, ...Object.fromEntries(lists) } as ProjectData)
  }

  async loadAllProjects(): Promise<ProjectData[]> {
    const list = await this.listProjects()
    return Promise.all(list.map((p) => this.loadProject(p.id)))
  }

  async createProject(input: ProjectData): Promise<string> {
    const plan = insertPlan(input)
    const projectId = plan[0].rows[0].id as string
    const [first, ...rest] = plan
    const { error } = await this.db.from(first.table).insert(first.rows)
    if (error) fail(error, 'Crear el proyecto')
    try {
      for (const step of rest) {
        const { error: e } = await this.db.from(step.table).insert(step.rows)
        if (e) fail(e, `Guardar ${step.table}`)
      }
    } catch (e) {
      await this.db.from('sam_projects').delete().eq('id', projectId)
      throw e
    }
    return projectId
  }

  async updateProject(project: Project): Promise<void> {
    const { error } = await this.db.from('sam_projects').update(toRow(project)).eq('id', project.id)
    if (error) fail(error, 'Guardar el proyecto')
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await this.db.from('sam_projects').delete().eq('id', id)
    if (error) fail(error, 'Borrar el proyecto')
  }

  async save<E extends EntityName>(projectId: string, entity: E, row: EntityMap[E]): Promise<EntityMap[E]> {
    const payload = toRow(row, projectId)
    if (isLogEntity(entity) && !payload.seq) delete payload.seq
    const { data, error } = await this.db.from(TABLE[entity]).upsert(payload, { onConflict: 'id' }).select('*').single()
    if (error) fail(error, 'Guardar')
    return fromRow<EntityMap[E]>(data)
  }

  async remove(_projectId: string, entity: EntityName, id: string): Promise<void> {
    if (NO_DELETE.has(entity)) throw new DataError('Ese registro no se borra: captura uno nuevo que lo corrija.')
    const { error, count } = await this.db.from(TABLE[entity]).delete({ count: 'exact' }).eq('id', id)
    if (error) fail(error, 'Borrar')
    if (entity === 'documents' && count === 0) throw new DataError('Solo se borra un borrador: lo enviado queda como constancia.')
  }

  async listGlobal<G extends GlobalName>(entity: G): Promise<GlobalMap[G][]> {
    const { data, error } = await this.db.from(GLOBAL_TABLE[entity]).select('*').order('created_at')
    if (error) fail(error, `Leer ${entity}`)
    return (data ?? []).map((r) => fromRow<GlobalMap[G]>(r))
  }

  async saveGlobal<G extends GlobalName>(entity: G, row: GlobalMap[G]): Promise<GlobalMap[G]> {
    const payload = toRow(row)
    delete payload.built_in
    const { data, error } = await this.db.from(GLOBAL_TABLE[entity]).upsert(payload, { onConflict: 'id' }).select('*').single()
    if (error) fail(error, 'Guardar')
    return fromRow<GlobalMap[G]>(data)
  }

  async removeGlobal(entity: GlobalName, id: string): Promise<void> {
    const { error } = await this.db.from(GLOBAL_TABLE[entity]).delete().eq('id', id)
    if (error) fail(error, 'Borrar')
  }

  async getFirm(): Promise<FirmSettings> {
    const { data, error } = await this.db.from('sam_settings').select('value').eq('key', 'firm').maybeSingle()
    if (error) fail(error, 'Leer los datos del despacho')
    return { ...EMPTY_FIRM, ...((data?.value as Partial<FirmSettings>) ?? {}) }
  }

  async saveFirm(firm: FirmSettings): Promise<void> {
    const { error } = await this.db.from('sam_settings').upsert({ key: 'firm', value: firm, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) fail(error, 'Guardar los datos del despacho')
  }

  async portalProjects(): Promise<ProjectSummary[]> {
    const { data, error } = await this.db.rpc('sam_portal_projects')
    if (error) fail(error, 'Leer el portal')
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({ id: String(r.id), key: String(r.key), name: String(r.name), client: String(r.client), cutoffDate: null }))
  }

  async portalData(projectId: string): Promise<PortalData> {
    const { data, error } = await this.db.rpc('sam_portal_data', { p_project: projectId })
    if (error) fail(error, 'Leer el portal')
    return fromPortalRpc(data as Record<string, unknown>)
  }

  async portalRequest(projectId: string, description: string, service: boolean, urgency: 'urgent' | 'normal' | null): Promise<number> {
    const { data, error } = await this.db.rpc('sam_portal_request', { p_project: projectId, p_description: description, p_service: service, p_urgency: urgency })
    if (error) fail(error, 'Enviar la solicitud')
    return Number(data)
  }

  async portalAcceptMilestone(_projectId: string, milestoneId: string, rating: number, comment: string): Promise<void> {
    const { error } = await this.db.rpc('sam_portal_accept_milestone', { p_milestone: milestoneId, p_rating: rating, p_comment: comment })
    if (error) fail(error, 'Aceptar el hito')
  }

  async portalDecideChange(_projectId: string, changeId: string, approve: boolean): Promise<void> {
    const { error } = await this.db.rpc('sam_portal_decide_change', { p_change: changeId, p_approve: approve })
    if (error) fail(error, 'Registrar la decisión')
  }
}
