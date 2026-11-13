/**
 * Lo que el cliente puede ver de su proyecto. En Supabase lo arma la función
 * sam_portal_data; en la demostración, esta misma regla sobre los datos locales.
 * Nunca salen costos, horas internas, márgenes, la bitácora de trabajo ni el D11.
 */
import { DOCUMENTS } from '../domain/catalogs'
import { DEFAULT_PARAMS } from '../domain/defaults'
import { folio } from '../domain/format'
import type { DocumentCode, Params, ProjectData, ProjectStage, StoredFile } from '../domain/types'
import { normalizeProject, type PortalData } from './repository'

const CLIENT_PARAMS: (keyof Params)[] = [
  'price',
  'clientReviewDays',
  'fixVerifyDays',
  'warrantyDays',
  'creditDays',
  'monthlyFee',
  'serviceStart',
  'monthlyPoolHours',
  'unusedHoursRule',
  'urgentResponseHours',
  'urgentResponseOffHours',
  'urgentSolutionHours',
  'normalResponseDays',
  'normalSolutionDays',
]

export function clientSafe(d: ProjectData): ProjectData {
  const params = { ...DEFAULT_PARAMS, estHourlyCost: null, directCostsBudget: null, minMargin: null, expectedMargin: null } as Params
  for (const k of CLIENT_PARAMS) (params as unknown as Record<string, unknown>)[k] = d.project.params[k]
  const serviceFolios = new Set(d.changes.filter((c) => c.service).map((c) => folio.change(c.seq)))
  return normalizeProject({
    project: { ...d.project, params, facts: { fields: {}, lists: {} }, baselineHours: null },
    segments: d.segments,
    milestones: d.milestones,
    contacts: d.contacts.map((c) => ({ id: c.id, name: c.name, role: c.role, roleKey: c.roleKey ?? null, position: c.position })),
    changes: d.changes,
    pendings: d.pendings,
    criteria: d.criteria,
    documents: d.documents.filter((x) => x.status !== 'draft' && DOCUMENTS[x.code].client).map((x) => ({ ...x, overrides: { fields: {}, lists: {} } })),
    workLogs: d.workLogs
      .filter((l) => l.relatedFolio && serviceFolios.has(l.relatedFolio))
      .map((l) => ({ ...l, personId: null, description: '', evidence: '', blocker: '', directCost: null })),
    routines: d.routines.map((r) => ({ ...r, ownerId: null })),
    routineRuns: d.routineRuns,
    signatures: d.signatures
      .filter((s) => d.documents.some((x) => x.id === s.documentId && DOCUMENTS[x.code].client))
      .map((s) => ({ ...s, userAgent: '' })),
  })
}

/** Fechas y horas locales de la bitácora de cambios (sin zona). */
const LOCAL_DATETIME = new Set(['receivedAt', 'firstResponseAt', 'resolvedAt'])
const camel = (k: string) => k.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase())
function rowsToCamel<T>(rows: unknown): T[] {
  if (!Array.isArray(rows)) return []
  return rows.map((r) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
      if (k === 'project_id' || k === 'created_at' || k === 'created_by' || k === 'updated_at') continue
      const key = camel(k)
      out[key] = typeof v === 'string' && LOCAL_DATETIME.has(key) && v.length > 16 ? v.slice(0, 16) : v
    }
    return out as T
  })
}

/** Convierte la respuesta de sam_portal_data a los tipos del dominio. */
export function fromPortalRpc(json: Record<string, unknown>): PortalData {
  const p = (json.project ?? {}) as Record<string, unknown>
  const me = (json.me ?? {}) as Record<string, unknown>
  const data = normalizeProject({
    project: {
      id: String(p.id),
      key: String(p.key ?? ''),
      name: String(p.name ?? ''),
      client: String(p.client ?? ''),
      budgetVersion: '',
      startDate: (p.start_date as string) ?? null,
      cutoffDate: (p.cutoff_date as string) ?? null,
      baselineHours: null,
      baselineSignedOn: null,
      nonWorkingDays: (p.non_working_days as string[]) ?? [],
      params: { ...DEFAULT_PARAMS, ...((p.params as Partial<Params>) ?? {}) },
    },
    segments: rowsToCamel(json.segments),
    milestones: rowsToCamel(json.milestones),
    criteria: rowsToCamel(json.criteria),
    contacts: rowsToCamel(json.contacts),
    changes: rowsToCamel(json.changes),
    pendings: rowsToCamel(json.pendings),
    documents: rowsToCamel(json.documents),
    workLogs: rowsToCamel(json.work_logs),
    routines: rowsToCamel(json.routines),
    routineRuns: rowsToCamel(json.routine_runs),
    signatures: rowsToCamel(json.signatures),
  })
  if (typeof p.stage === 'string') data.project.stage = p.stage as ProjectStage
  return {
    data,
    me: {
      contactId: (me.contact_id as string) ?? null,
      email: String(me.email ?? ''),
      roleKey: (me.role_key as PortalData['me']['roleKey']) ?? null,
    },
    files: rowsToCamel<StoredFile>(json.files).map((f) => ({ ...f, projectId: String(p.id), prospectId: null, clientVisible: true, notes: '' })),
  }
}

export const CLIENT_DOCS = (Object.keys(DOCUMENTS) as DocumentCode[]).filter((c) => DOCUMENTS[c].client)
