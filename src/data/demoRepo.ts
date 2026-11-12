import { nextSeq } from '../domain/control'
import { todayInMexico } from '../domain/dates'
import { localId } from '../domain/factory'
import type { FirmSettings, Project, ProjectData } from '../domain/types'
import {
  DataError,
  NO_DELETE,
  normalizeProject,
  type EntityMap,
  type EntityName,
  type GlobalMap,
  type GlobalName,
  type PortalData,
  type ProjectSummary,
  type Repository,
} from './repository'
import { clientSafe } from './portalView'
import { freezeSent } from '../docs/autofill'

const STORAGE_KEY = 'sam-demo-v2'

interface DemoState {
  projects: ProjectData[]
  global: { [G in GlobalName]: GlobalMap[G][] }
  firm: FirmSettings
}

/**
 * Modo demostración: los datos viven solo en este navegador (localStorage), empezando
 * por el caso ficticio CE-INV. Sirve para ver el software sin base de datos.
 */
export class DemoRepository implements Repository {
  readonly mode = 'demo' as const
  private state!: DemoState
  private readonly ready: Promise<void>

  constructor() {
    // La semilla CE-INV pesa: se carga aparte y solo la primera vez.
    const stored = this.read()
    this.ready = stored
      ? Promise.resolve(void (this.state = stored))
      : import('./ceinv').then(({ buildCeInv, buildDemoProspects, buildDemoProposals, DEMO_FIRM }) => {
          const prospects = buildDemoProspects()
          const proposals = buildDemoProposals()
          this.state = {
            projects: [freezeSent({ data: buildCeInv(), firm: DEMO_FIRM, proposals, prospects })],
            global: { prospects, proposals, wbsTemplates: [], baseHours: [] },
            firm: DEMO_FIRM,
          }
        })
  }

  private read(): DemoState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const s = JSON.parse(raw) as DemoState
      s.projects = s.projects.map((p) => normalizeProject(p))
      return s
    } catch {
      return null
    }
  }

  private write() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch {
      // Sin almacenamiento (ventana privada): los cambios duran mientras la página esté abierta.
    }
  }

  static reset() {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem('sam-demo-v1')
    } catch {
      /* nada que borrar */
    }
  }

  private async find(id: string): Promise<ProjectData> {
    await this.ready
    const p = this.state.projects.find((x) => x.project.id === id)
    if (!p) throw new DataError('No existe ese proyecto.')
    return p
  }

  async listProjects(): Promise<ProjectSummary[]> {
    await this.ready
    return this.state.projects.map(({ project: p }) => ({ id: p.id, key: p.key, name: p.name, client: p.client, cutoffDate: p.cutoffDate }))
  }

  async loadProject(id: string): Promise<ProjectData> {
    return normalizeProject(structuredClone(await this.find(id)))
  }

  async loadAllProjects(): Promise<ProjectData[]> {
    await this.ready
    return this.state.projects.map((p) => normalizeProject(structuredClone(p)))
  }

  async createProject(data: ProjectData): Promise<string> {
    await this.ready
    if (this.state.projects.some((x) => x.project.key === data.project.key))
      throw new DataError(`Ya existe un proyecto con la clave ${data.project.key}.`, 'conflict')
    this.state.projects.push(normalizeProject(structuredClone(data)))
    this.write()
    return data.project.id
  }

  async updateProject(project: Project): Promise<void> {
    const p = await this.find(project.id)
    p.project = structuredClone(project)
    this.write()
  }

  async deleteProject(id: string): Promise<void> {
    await this.ready
    this.state.projects = this.state.projects.filter((x) => x.project.id !== id)
    for (const pr of this.state.global.prospects) if (pr.projectId === id) pr.projectId = null
    this.write()
  }

  async save<E extends EntityName>(projectId: string, entity: E, row: EntityMap[E]): Promise<EntityMap[E]> {
    const p = await this.find(projectId)
    const list = p[entity] as unknown as EntityMap[E][]
    const saved = structuredClone(row)
    if (entity === 'gates') {
      // En la demostración todos son administradores; en Supabase lo revisa la base.
    }
    const i = list.findIndex((x) => x.id === row.id)
    if (i >= 0) list[i] = saved
    else {
      if ('seq' in saved && !(saved as { seq: number }).seq && (entity === 'workLogs' || entity === 'decisions' || entity === 'changes' || entity === 'risks')) {
        ;(saved as { seq: number }).seq = nextSeq(list as unknown as { seq: number }[])
      }
      list.push(saved)
    }
    this.write()
    return structuredClone(saved)
  }

  async remove(projectId: string, entity: EntityName, id: string): Promise<void> {
    if (NO_DELETE.has(entity)) throw new DataError('Ese registro no se borra: captura uno nuevo que lo corrija.')
    const p = await this.find(projectId)
    if (entity === 'documents' && p.documents.find((d) => d.id === id)?.status !== 'draft')
      throw new DataError('Solo se borra un borrador: lo enviado queda como constancia.')
    ;(p[entity] as unknown as { id: string }[]) = (p[entity] as unknown as { id: string }[]).filter((x) => x.id !== id)
    this.write()
  }

  async listGlobal<G extends GlobalName>(entity: G): Promise<GlobalMap[G][]> {
    await this.ready
    return structuredClone(this.state.global[entity]) as GlobalMap[G][]
  }

  async saveGlobal<G extends GlobalName>(entity: G, row: GlobalMap[G]): Promise<GlobalMap[G]> {
    await this.ready
    const list = this.state.global[entity] as GlobalMap[G][]
    const saved = structuredClone(row)
    const i = list.findIndex((x) => x.id === row.id)
    if (i >= 0) list[i] = saved
    else list.push(saved)
    this.write()
    return structuredClone(saved)
  }

  async removeGlobal(entity: GlobalName, id: string): Promise<void> {
    await this.ready
    if (entity === 'baseHours') throw new DataError('Las versiones de horas base no se borran.')
    ;(this.state.global[entity] as { id: string }[]) = (this.state.global[entity] as { id: string }[]).filter((x) => x.id !== id)
    if (entity === 'prospects') this.state.global.proposals = this.state.global.proposals.filter((x) => x.prospectId !== id)
    this.write()
  }

  async getFirm(): Promise<FirmSettings> {
    await this.ready
    return structuredClone(this.state.firm)
  }

  async saveFirm(firm: FirmSettings): Promise<void> {
    await this.ready
    this.state.firm = structuredClone(firm)
    this.write()
  }

  /* Portal: en la demostración se ve el portal de cualquier proyecto, como lo vería su cliente. */
  async portalProjects(): Promise<ProjectSummary[]> {
    return this.listProjects()
  }

  async portalData(projectId: string): Promise<PortalData> {
    const d = await this.find(projectId)
    const me = d.contacts.find((c) => c.roleKey === 'responsible') ?? d.contacts[0] ?? null
    return { data: clientSafe(structuredClone(d)), me: { contactId: me?.id ?? null, email: me?.email ?? '', roleKey: me?.roleKey ?? null } }
  }

  async portalRequest(projectId: string, description: string, service: boolean, urgency: 'urgent' | 'normal' | null): Promise<number> {
    const d = await this.find(projectId)
    if (description.trim().length < 3) throw new DataError('Describe qué necesitas.')
    const me = d.contacts.find((c) => c.roleKey === 'responsible') ?? d.contacts[0] ?? null
    const seq = nextSeq(d.changes)
    const now = new Date()
    const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
    d.changes.push({
      id: localId('chg'),
      seq,
      date: todayInMexico(now),
      channel: 'portal',
      requestedById: me?.id ?? null,
      description: description.trim(),
      kind: null,
      hours: null,
      amount: null,
      segmentId: null,
      businessDaysMoved: null,
      billing: null,
      status: 'in_review',
      decidedById: null,
      responseDate: null,
      recordedIn: 'Portal del cliente',
      baselineNote: '',
      service,
      urgency,
      receivedAt: `${todayInMexico(now)}T${hhmm}`,
      firstResponseAt: null,
      resolvedAt: null,
    })
    this.write()
    return seq
  }

  async portalAcceptMilestone(projectId: string, milestoneId: string, rating: number, comment: string): Promise<void> {
    const d = await this.find(projectId)
    const m = d.milestones.find((x) => x.id === milestoneId)
    if (!m) throw new DataError('No existe ese hito.')
    if (!m.actualDelivery) throw new DataError('El hito todavía no se entrega a pruebas.')
    if (m.actaDate) throw new DataError('El hito ya está aceptado.')
    if (!(rating >= 1 && rating <= 10)) throw new DataError('La calificación va de 1 a 10.')
    m.actaDate = todayInMexico()
    m.clientRating = Math.round(rating)
    m.clientComment = comment
    this.write()
  }

  async portalDecideChange(projectId: string, changeId: string, approve: boolean): Promise<void> {
    const d = await this.find(projectId)
    const c = d.changes.find((x) => x.id === changeId)
    if (!c || c.kind !== 'scope_change' || !(c.status === 'in_review' || c.status === 'waiting_client'))
      throw new DataError('Esta solicitud no espera una decisión.')
    const decides = d.contacts.find((x) => x.roleKey === 'decides')
    c.status = approve ? 'approved' : 'rejected'
    c.decidedById = decides?.id ?? null
    c.responseDate = todayInMexico()
    this.write()
  }
}
