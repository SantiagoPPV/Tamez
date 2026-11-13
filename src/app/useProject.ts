import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeControl, type ControlResult } from '../domain/control'
import { stageAfterChange } from '../domain/stage'
import type { Project, ProjectData } from '../domain/types'
import type { EntityMap, EntityName } from '../data/repository'
import { syncProjectStage } from './lifecycle'
import { useRepo } from './session'

/** Guardar estos renglones puede mover la etapa del cliente (cobro, puertas, actas de hito). */
const STAGE_ENTITIES = new Set<EntityName>(['gates', 'invoices', 'milestones'])

export interface ProjectApi {
  data: ProjectData
  result: ControlResult
  save: <E extends EntityName>(entity: E, row: EntityMap[E]) => Promise<EntityMap[E]>
  remove: (entity: EntityName, id: string) => Promise<void>
  updateProject: (project: Project) => Promise<void>
  reload: () => Promise<void>
}

/** Carga un proyecto y recalcula todo cada vez que cambia un dato. */
export function useProject(id: string) {
  const repo = useRepo()
  const [data, setData] = useState<ProjectData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setError(null)
      setData(await repo.loadProject(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [repo, id])

  useEffect(() => {
    void reload()
  }, [reload])

  const result = useMemo(() => (data ? computeControl(data) : null), [data])
  // Copia al día de los datos, para decidir sin esperar al siguiente render.
  const current = useRef<ProjectData | null>(null)
  useEffect(() => {
    current.current = data
  }, [data])

  const save = useCallback(
    async <E extends EntityName>(entity: E, row: EntityMap[E]) => {
      const saved = await repo.save(id, entity, row)
      const merge = (d: ProjectData): ProjectData => {
        const list = d[entity] as unknown as EntityMap[E][]
        const exists = list.some((x) => x.id === row.id || x.id === saved.id)
        const next = exists ? list.map((x) => (x.id === row.id || x.id === saved.id ? saved : x)) : [...list, saved]
        return { ...d, [entity]: next }
      }
      const before = current.current
      setData((d) => (d ? merge(d) : d))
      if (STAGE_ENTITIES.has(entity) && before && stageAfterChange(merge(before))) {
        const moved = await syncProjectStage(repo, id)
        if (moved) setData((d) => (d ? { ...d, project: { ...d.project, stage: moved.to } } : d))
      }
      return saved
    },
    [repo, id],
  )

  const remove = useCallback(
    async (entity: EntityName, rowId: string) => {
      await repo.remove(id, entity, rowId)
      setData((d) => (d ? { ...d, [entity]: (d[entity] as { id: string }[]).filter((x) => x.id !== rowId) } : d))
    },
    [repo, id],
  )

  const updateProject = useCallback(
    async (project: Project) => {
      await repo.updateProject(project)
      setData((d) => (d ? { ...d, project } : d))
    },
    [repo],
  )

  const api: ProjectApi | null =
    data && result ? { data, result, save, remove, updateProject, reload } : null
  return { api, error }
}
