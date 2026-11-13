import { nextSeq } from '../domain/control'
import { normalizeProposal, normalizeProspect } from '../domain/crm'
import { todayInMexico } from '../domain/dates'
import { localId } from '../domain/factory'
import type { FirmSettings, Project, ProjectData, Signature, StoredFile } from '../domain/types'
import {
  DataError,
  NO_DELETE,
  normalizeProject,
  type EntityMap,
  type EntityName,
  type GlobalMap,
  type GlobalName,
  type NewFile,
  type PortalData,
  type ProjectSummary,
  type Repository,
  type SharedDocument,
} from './repository'
import { clientSafe } from './portalView'
import { freezeSent } from '../docs/autofill'
import { canonicalJson, sha256 } from '../docs/formatDoc'
import { deleteBlob, getBlob, putBlob } from './blobStore'

const STORAGE_KEY = 'sam-demo-v3'

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
            global: { prospects, proposals, wbsTemplates: [], baseHours: [], files: [], notifications: [], aiJobs: [], shares: [] },
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
      const g = s.global as Partial<DemoState['global']>
      s.global = { ...s.global, files: g.files ?? [], notifications: g.notifications ?? [], aiJobs: g.aiJobs ?? [], shares: g.shares ?? [] }
      s.global.prospects = s.global.prospects.map(normalizeProspect)
      s.global.proposals = s.global.proposals.map(normalizeProposal)
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
      localStorage.removeItem('sam-demo-v2')
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
    return this.state.projects.map(({ project: p }) => ({ id: p.id, key: p.key, name: p.name, client: p.client, cutoffDate: p.cutoffDate, stage: p.stage ?? null }))
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
    if (entity === 'signatures') throw new DataError('Las firmas solo se crean al firmar.')
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
    let rows = structuredClone(this.state.global[entity]) as GlobalMap[G][]
    if (entity === 'prospects') rows = (rows as GlobalMap['prospects'][]).map(normalizeProspect) as GlobalMap[G][]
    if (entity === 'proposals') rows = (rows as GlobalMap['proposals'][]).map(normalizeProposal) as GlobalMap[G][]
    if (entity === 'notifications') return (rows as GlobalMap['notifications'][]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) as GlobalMap[G][]
    return rows
  }

  async getGlobal<G extends GlobalName>(entity: G, id: string): Promise<GlobalMap[G] | null> {
    await this.ready
    const row = (this.state.global[entity] as { id: string }[]).find((x) => x.id === id)
    return row ? (structuredClone(row) as GlobalMap[G]) : null
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
    // En la demostración se ve el portal como quien decide y paga (puede firmar y aprobar).
    const me = d.contacts.find((c) => c.roleKey === 'decides') ?? d.contacts.find((c) => c.roleKey === 'responsible') ?? d.contacts[0] ?? null
    const files = this.state.global.files.filter((f) => f.projectId === projectId && f.clientVisible)
    return { data: clientSafe(structuredClone(d)), me: { contactId: me?.id ?? null, email: me?.email ?? '', roleKey: me?.roleKey ?? null }, files: structuredClone(files) }
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

  /* CRM vinculado a operaciones */
  async uploadFile(meta: NewFile, file: Blob & { name?: string }): Promise<StoredFile> {
    await this.ready
    const id = localId('file')
    const name = meta.name || file.name || 'archivo'
    const row: StoredFile = { ...meta, id, name, mime: file.type || 'application/octet-stream', size: file.size, path: `demo/${id}/${name}`, uploadedOn: todayInMexico() }
    await putBlob(id, file)
    this.state.global.files.push(row)
    this.write()
    return structuredClone(row)
  }

  async fileUrl(file: Pick<StoredFile, 'id' | 'path'>): Promise<string> {
    const blob = await getBlob(file.id)
    if (!blob) throw new DataError('Ese archivo ya no está en este navegador.')
    return URL.createObjectURL(blob)
  }

  async removeFile(file: StoredFile): Promise<void> {
    await this.ready
    await deleteBlob(file.id)
    this.state.global.files = this.state.global.files.filter((f) => f.id !== file.id)
    this.write()
  }

  private async sign(projectId: string, documentId: string, signerId: string, name: string, drawing: string | null, kind: 'client' | 'firm'): Promise<Signature> {
    const p = await this.find(projectId)
    const doc = p.documents.find((x) => x.id === documentId)
    if (!doc) throw new DataError('No existe ese documento.')
    if (doc.status !== 'sent' || !doc.snapshot) throw new DataError('El documento todavía no se envía para firma.')
    const signer = (doc.signers ?? []).find((x) => x.id === signerId)
    if (!signer || signer.kind !== kind) throw new DataError(kind === 'firm' ? 'Ese firmante no firma por el despacho.' : 'Ese firmante no firma por el cliente.')
    if (name.trim().length < 3) throw new DataError('Escribe tu nombre completo para firmar.')
    if (p.signatures.some((x) => x.documentId === doc.id && x.documentVersion === doc.version && x.signerId === signerId)) throw new DataError('Esa firma ya está registrada.')
    const sig: Signature = {
      id: localId('sig'),
      documentId: doc.id,
      documentVersion: doc.version,
      documentHash: await sha256(canonicalJson(doc.snapshot)),
      signerId,
      signerName: name.trim(),
      signerEmail: signer.email,
      signerRole: signer.role,
      kind,
      signedAt: new Date().toISOString(),
      method: kind === 'firm' ? 'staff' : 'portal',
      drawing,
      userAgent: navigator.userAgent.slice(0, 300),
    }
    p.signatures.push(sig)
    const all = (doc.signers ?? []).every((s) => p.signatures.some((x) => x.documentId === doc.id && x.documentVersion === doc.version && x.signerId === s.id))
    if (all) {
      doc.status = 'signed'
      doc.signedOn = todayInMexico()
    }
    if (kind === 'client')
      this.state.global.notifications.push({
        id: localId('ntf'),
        kind: 'signature',
        title: `${name.trim()} firmó ${doc.code}`,
        body: 'Firma electrónica desde el portal del cliente.',
        link: `/p/${projectId}/documentos/${doc.id}`,
        projectId,
        prospectId: null,
        createdAt: new Date().toISOString(),
        readBy: [],
      })
    this.write()
    return structuredClone(sig)
  }

  signAsFirm(projectId: string, documentId: string, signerId: string, name: string, drawing: string | null) {
    return this.sign(projectId, documentId, signerId, name, drawing, 'firm')
  }

  async portalSign(projectId: string, documentId: string, signerId: string, name: string, drawing: string | null): Promise<void> {
    await this.sign(projectId, documentId, signerId, name, drawing, 'client')
  }

  async sharedDocument(token: string): Promise<SharedDocument | null> {
    await this.ready
    const sh = this.state.global.shares.find((x) => x.token === token && !x.revoked && x.expiresOn >= todayInMexico())
    if (!sh) return null
    const p = sh.projectId ? this.state.projects.find((x) => x.project.id === sh.projectId) : null
    return {
      code: sh.code,
      title: sh.title,
      snapshot: structuredClone(sh.snapshot),
      signers: structuredClone(sh.signers),
      signatures: p && sh.documentId ? structuredClone(p.signatures.filter((x) => x.documentId === sh.documentId)) : [],
      expiresOn: sh.expiresOn,
      project: p ? { key: p.project.key, name: p.project.name, client: p.project.client } : null,
    }
  }

  async currentUser() {
    return { id: 'demo', email: null }
  }

  async accessToken() {
    return null
  }
}
