/**
 * Base de estimaciones con horas reales (versión 4).
 * «Cómo se calibra»: la nueva hora base es el promedio de horas reales de las actividades de
 * ese tipo y nivel terminadas desde la versión anterior; se redondea a media hora; con menos de
 * cinco actividades, no se toca. Solo cuentan la clase planeada sin formación y los bloques 4, 5 y 6.
 */
import { computeControl } from './control'
import type { ActivityType, BaseHoursTable, ProjectData } from './types'

export const LEVELS = ['simple', 'medium', 'complex'] as const
export type CalLevel = (typeof LEVELS)[number]
export const TYPES: ActivityType[] = ['screen', 'integration', 'database', 'report', 'data_load', 'release', 'document']
export const MIN_SAMPLE = 5

export interface CalibrationSample {
  projectKey: string
  key: string
  name: string
  activityType: ActivityType
  level: CalLevel
  estimated: number
  real: number
  finishedOn: string
}

export interface CalibrationCell {
  activityType: ActivityType
  level: CalLevel
  count: number
  avgReal: number | null
  avgEstimated: number | null
  efficiency: number | null
  current: number
  proposed: number
  changes: boolean
}

/** Actividades terminadas que sirven para calibrar, de todos los proyectos. */
export function calibrationSamples(projects: ProjectData[], since?: string | null): CalibrationSample[] {
  const out: CalibrationSample[] = []
  for (const data of projects) {
    const r = computeControl(data)
    for (const w of data.wbs) {
      const c = r.wbs.get(w.id)
      if (!c?.finishedOn || c.finishedOn > r.cutoff) continue
      if (since && c.finishedOn <= since) continue
      if (!w.block || ![4, 5, 6].includes(w.block)) continue
      if (!w.activityType || !w.level || w.level === 'own') continue
      if (!w.estimatedHours || !c.plannedClassHours) continue
      out.push({
        projectKey: data.project.key,
        key: w.key,
        name: w.name,
        activityType: w.activityType,
        level: w.level,
        estimated: w.estimatedHours,
        real: c.plannedClassHours,
        finishedOn: c.finishedOn,
      })
    }
  }
  return out
}

const half = (x: number) => Math.round(x * 2) / 2

export function proposeBaseHours(samples: CalibrationSample[], current: BaseHoursTable): CalibrationCell[] {
  const cells: CalibrationCell[] = []
  for (const t of TYPES) {
    for (const level of LEVELS) {
      const s = samples.filter((x) => x.activityType === t && x.level === level)
      const count = s.length
      const sumReal = s.reduce((a, x) => a + x.real, 0)
      const sumEst = s.reduce((a, x) => a + x.estimated, 0)
      const avgReal = count ? sumReal / count : null
      const cur = current[t][level]
      const proposed = count >= MIN_SAMPLE && avgReal != null ? half(avgReal) : cur
      cells.push({
        activityType: t,
        level,
        count,
        avgReal,
        avgEstimated: count ? sumEst / count : null,
        efficiency: sumReal ? sumEst / sumReal : null,
        current: cur,
        proposed,
        changes: proposed !== cur,
      })
    }
  }
  return cells
}

export function tableFromCells(cells: CalibrationCell[], current: BaseHoursTable): BaseHoursTable {
  const t = structuredClone(current)
  for (const c of cells) t[c.activityType][c.level] = c.proposed
  return t
}

export interface ProjectLearning {
  key: string
  name: string
  plannedHours: number
  realHours: number
  efficiency: number | null
  reserveUsedPct: number | null
  poolUsedPct: number | null
  expectedMargin: number | null
  projectedMargin: number | null
}

/** Reserva y bolsa consumidas por proyecto: con eso se revisan el 15 % y el 8 %. */
export function projectLearning(projects: ProjectData[]): ProjectLearning[] {
  return projects.map((data) => {
    const r = computeControl(data)
    return {
      key: data.project.key,
      name: data.project.name,
      plannedHours: r.budget.plannedHours,
      realHours: r.figures.realHours,
      efficiency: r.indicators.find((i) => i.key === 'efficiency')?.value ?? null,
      reserveUsedPct: r.figures.reserveUsedPct,
      poolUsedPct: r.figures.poolUsedPct,
      expectedMargin: r.budget.expectedMarginPct,
      projectedMargin: r.tracking.projectedMarginPct,
    }
  })
}
