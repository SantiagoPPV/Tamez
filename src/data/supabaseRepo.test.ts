import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildCeInv } from './ceinv'
import { fromRow, insertPlan, remapIds, toRow } from './supabaseRepo'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('Mapeo hacia Supabase', () => {
  it('camelCase ↔ snake_case, con las columnas renombradas del corte semanal', () => {
    const row = toRow({ segmentId: 'a', requestedById: 'b', values: {}, lights: {} }, 'p')
    expect(row).toEqual({ segment_id: 'a', requested_by_id: 'b', snapshot_values: {}, snapshot_lights: {}, project_id: 'p' })
    expect(fromRow({ segment_id: 'a', snapshot_values: {}, project_id: 'p', created_at: 'x' })).toEqual({ segmentId: 'a', values: {} })
  })

  it('remapea todos los ids a uuid y conserva las referencias', () => {
    const src = buildCeInv()
    const d = remapIds(src)
    expect(d.project.id).toMatch(UUID)
    const segIds = new Set(d.segments.map((s) => s.id))
    const memberIds = new Set(d.members.map((m) => m.id))
    for (const w of d.wbs) {
      expect(w.id).toMatch(UUID)
      if (w.segmentId) expect(segIds.has(w.segmentId)).toBe(true)
      if (w.ownerId) expect(memberIds.has(w.ownerId)).toBe(true)
      if (w.reviewerId) expect(memberIds.has(w.reviewerId)).toBe(true)
    }
    expect(d.wbs.filter((w) => w.reviewerId).length).toBe(src.wbs.filter((w) => w.reviewerId).length)
    for (const l of d.workLogs) if (l.personId) expect(memberIds.has(l.personId)).toBe(true)
  })

  it('el plan de inserción cubre todo CE-INV', () => {
    const plan = insertPlan(buildCeInv())
    const count = Object.fromEntries(plan.map((p) => [p.table, p.rows.length]))
    expect(count).toMatchObject({ sam_projects: 1, sam_segments: 5, sam_milestones: 3, sam_wbs_items: 138, sam_work_logs: 144 })
    if (process.env.SAM_DUMP_PLAN) writeFileSync(process.env.SAM_DUMP_PLAN, JSON.stringify(plan))
  })
})
