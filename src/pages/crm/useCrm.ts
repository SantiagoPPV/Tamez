import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRepo } from '../../app/session'
import { useFirm, useGlobal } from '../../app/useGlobal'
import type { CrmContext } from '../../domain/crm'
import type { ProjectData } from '../../domain/types'

/** Todo lo de un prospecto: sus propuestas y, desde la puerta 1, su expediente de proyecto. */
export function useCrm(prospectId: string) {
  const repo = useRepo()
  const prospects = useGlobal('prospects')
  const proposals = useGlobal('proposals')
  const { firm } = useFirm()
  const prospect = prospects.rows?.find((p) => p.id === prospectId) ?? null
  const mine = useMemo(() => (proposals.rows ?? []).filter((p) => p.prospectId === prospectId), [proposals.rows, prospectId])
  const [project, setProject] = useState<ProjectData | null>(null)
  const projectId = prospect?.projectId ?? null
  const reloadProject = useCallback(async () => {
    setProject(projectId ? await repo.loadProject(projectId).catch(() => null) : null)
  }, [repo, projectId])
  useEffect(() => {
    void reloadProject()
  }, [reloadProject])
  const ctx: CrmContext | null = useMemo(() => (prospect ? { prospect, proposals: mine, project, firm } : null), [prospect, mine, project, firm])
  return {
    ready: Boolean(prospects.rows && proposals.rows),
    error: prospects.error ?? proposals.error,
    prospect,
    proposals: mine,
    project,
    firm,
    ctx,
    saveProspect: prospects.save,
    proposalsApi: proposals,
    prospectsApi: prospects,
    reloadProject,
    async reloadAll() {
      await Promise.all([prospects.reload(), proposals.reload()])
      await reloadProject()
    },
  }
}

export type Crm = ReturnType<typeof useCrm>
