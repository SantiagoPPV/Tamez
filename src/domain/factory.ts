import { DEFAULT_SEGMENTS, STANDARD_ROUTINES } from './catalogs'
import { DEFAULT_PARAMS } from './defaults'
import type { HatName, ProjectData, WbsItem, WorkLog } from './types'

/**
 * Identificador nuevo: un uuid, válido tanto en la demostración como en Supabase.
 * El prefijo solo documenta qué se está creando.
 */
export function localId(_prefix = 'id'): string {
  return crypto.randomUUID()
}

const HATS: HatName[] = [
  'sales',
  'project_lead',
  'analysis',
  'architecture',
  'construction',
  'quality',
  'administration',
  'support',
]

/** Un proyecto en blanco, como la plantilla de la hoja de control. */
export function emptyProject(init: { id?: string; key?: string; name?: string; client?: string } = {}): ProjectData {
  const id = init.id ?? localId('prj')
  return {
    project: {
      id,
      key: init.key ?? '',
      name: init.name ?? '',
      client: init.client ?? '',
      budgetVersion: 'v1',
      startDate: null,
      cutoffDate: null,
      baselineHours: null,
      baselineSignedOn: null,
      nonWorkingDays: [],
      params: { ...DEFAULT_PARAMS },
    },
    segments: DEFAULT_SEGMENTS.map((name, i) => ({ id: localId('seg'), position: i + 1, name })),
    milestones: [],
    members: [],
    contacts: [],
    wbs: [],
    workLogs: [],
    decisions: [],
    changes: [],
    risks: [],
    pendings: [],
    invoices: [],
    hats: HATS.map((hat) => ({ id: localId('hat'), hat, holderId: null, level: 'na', backupId: null })),
    snapshots: [],
    gates: [],
    criteria: [],
    documents: [],
    routines: STANDARD_ROUTINES.map((r) => ({ id: localId('rut'), ...r, ownerId: null, active: true })),
    routineRuns: [],
    portalAccess: [],
  }
}

export function newWbsItem(partial: Partial<WbsItem> = {}): WbsItem {
  return {
    id: localId('wbs'),
    position: 0,
    rowClass: 'activity',
    key: '',
    name: '',
    segmentId: null,
    deliverable: '',
    block: null,
    activityType: null,
    level: null,
    ownerId: null,
    estimatedHours: null,
    plannedDate: null,
    remainingHours: null,
    forecastDate: null,
    status: 'todo',
    checklistComplete: null,
    checklist: [],
    evidence: '',
    reviewerId: null,
    reviewDate: null,
    internalDefects: null,
    actualEndDate: null,
    correctionBudget: false,
    changeFolio: null,
    ...partial,
  }
}

export function newWorkLog(partial: Partial<WorkLog> & { seq: number; date: string }): WorkLog {
  return {
    id: localId('log'),
    personId: null,
    activityKey: '',
    description: '',
    hours: null,
    hourClass: 'planned',
    mark: null,
    relatedFolio: null,
    directCost: null,
    evidence: '',
    blocker: '',
    ...partial,
  }
}
