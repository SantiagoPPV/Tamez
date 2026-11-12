import { nextSeq } from '../domain/control'
import type { Project, ProjectData } from '../domain/types'
import { DataError, isLogEntity, type EntityMap, type EntityName, type ProjectSummary, type Repository } from './repository'

const STORAGE_KEY = 'sam-demo-v1'

/**
 * Modo demostración: los datos viven solo en este navegador (localStorage), empezando
 * por el caso ficticio CE-INV. Sirve para ver el software sin base de datos.
 */
export class DemoRepository implements Repository {
  readonly mode = 'demo' as const
  private projects: ProjectData[] = []
  private readonly ready: Promise<void>

  constructor() {
    // La semilla CE-INV pesa: se carga aparte y solo la primera vez.
    const stored = this.read()
    this.ready = stored
      ? Promise.resolve(void (this.projects = stored))
      : import('./ceinv').then(({ buildCeInv }) => {
          this.projects = [buildCeInv()]
        })
  }

  private read(): ProjectData[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as ProjectData[]) : null
    } catch {
      return null
    }
  }

  private write() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projects))
    } catch {
      // Sin almacenamiento (ventana privada): los cambios duran mientras la página esté abierta.
    }
  }

  static reset() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* nada que borrar */
    }
  }

  private async find(id: string): Promise<ProjectData> {
    await this.ready
    const p = this.projects.find((x) => x.project.id === id)
    if (!p) throw new DataError('No existe ese proyecto.')
    return p
  }

  async listProjects(): Promise<ProjectSummary[]> {
    await this.ready
    return this.projects.map(({ project: p }) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      client: p.client,
      cutoffDate: p.cutoffDate,
    }))
  }

  async loadProject(id: string): Promise<ProjectData> {
    return structuredClone(await this.find(id))
  }

  async createProject(data: ProjectData): Promise<string> {
    await this.ready
    if (this.projects.some((x) => x.project.key === data.project.key))
      throw new DataError(`Ya existe un proyecto con la clave ${data.project.key}.`, 'conflict')
    this.projects.push(structuredClone(data))
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
    this.projects = this.projects.filter((x) => x.project.id !== id)
    this.write()
  }

  async save<E extends EntityName>(projectId: string, entity: E, row: EntityMap[E]): Promise<EntityMap[E]> {
    const p = await this.find(projectId)
    const list = p[entity] as unknown as EntityMap[E][]
    const saved = structuredClone(row)
    const i = list.findIndex((x) => x.id === row.id)
    if (i >= 0) list[i] = saved
    else {
      if (isLogEntity(entity) && !(saved as { seq: number }).seq) {
        ;(saved as { seq: number }).seq = nextSeq(list as unknown as { seq: number }[])
      }
      list.push(saved)
    }
    this.write()
    return structuredClone(saved)
  }

  async remove(projectId: string, entity: EntityName, id: string): Promise<void> {
    if (isLogEntity(entity)) throw new DataError('Ningún renglón de una bitácora se borra: captura uno nuevo que cite el folio.')
    const p = await this.find(projectId)
    ;(p[entity] as unknown as { id: string }[]) = (p[entity] as unknown as { id: string }[]).filter((x) => x.id !== id)
    this.write()
  }
}
