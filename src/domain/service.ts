/**
 * Servicio mensual (Procedimientos, 6): solicitudes urgentes y normales contra el compromiso,
 * bolsa de horas del mes, defectos en garantía y rutinas. Alimenta la D09.
 * Las solicitudes viven en la bitácora de cambios (marcadas «servicio»); sus horas, en la de trabajo.
 */
import { BusinessCalendar, addDays, toUTC } from './dates'
import type { ISODate } from './dates'
import { folio } from './format'
import type { ChangeRequest, ProjectData, Routine, RoutineRun } from './types'

/** Horario hábil para medir tiempos de respuesta (valor inicial). */
export const WORK_START = 9
export const WORK_END = 18

export const monthOf = (d: string | null | undefined) => (d ? d.slice(0, 7) : null)

export function monthRange(month: string): { from: ISODate; to: ISODate; days: number } {
  const [y, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from, to: `${month}-${String(last).padStart(2, '0')}`, days: last }
}

export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

export function monthsBetween(fromMonth: string, toMonth: string): string[] {
  const out: string[] = []
  for (let m = fromMonth; m <= toMonth && out.length < 120; m = nextMonth(m)) out.push(m)
  return out
}

const MS_MIN = 60_000

/** Minutos de reloj entre dos fechas y horas «AAAA-MM-DDTHH:mm». */
export function clockMinutes(a: string, b: string): number {
  return Math.round((Date.parse(`${b.slice(0, 16)}:00Z`) - Date.parse(`${a.slice(0, 16)}:00Z`)) / MS_MIN)
}

/** Minutos hábiles (lunes a viernes, 9:00 a 18:00, sin inhábiles) entre dos fechas y horas. */
export function businessMinutes(a: string, b: string, cal: BusinessCalendar): number {
  if (b <= a) return 0
  let total = 0
  let day = a.slice(0, 10)
  const endDay = b.slice(0, 10)
  for (let guard = 0; day <= endDay && guard < 400; guard++, day = addDays(day, 1)) {
    if (!cal.isBusinessDay(day)) continue
    const open = Date.parse(`${day}T${String(WORK_START).padStart(2, '0')}:00:00Z`)
    const close = Date.parse(`${day}T${String(WORK_END).padStart(2, '0')}:00:00Z`)
    const s = Math.max(open, Date.parse(`${a.slice(0, 16)}:00Z`))
    const e = Math.min(close, Date.parse(`${b.slice(0, 16)}:00Z`))
    if (e > s) total += (e - s) / MS_MIN
  }
  return Math.round(total)
}

export function inBusinessHours(at: string, cal: BusinessCalendar): boolean {
  const h = Number(at.slice(11, 13)) + Number(at.slice(14, 16)) / 60
  return cal.isBusinessDay(at.slice(0, 10)) && h >= WORK_START && h < WORK_END
}

export interface RequestTiming {
  change: ChangeRequest
  folio: string
  urgent: boolean
  warranty: boolean
  /** Minutos a la primera respuesta (reloj en urgentes, hábiles en normales) */
  responseMinutes: number | null
  solutionMinutes: number | null
  responseLimit: number
  solutionLimit: number
  responseOk: boolean | null
  solutionOk: boolean | null
  open: boolean
}

export function requestTiming(c: ChangeRequest, data: ProjectData, cal: BusinessCalendar): RequestTiming {
  const p = data.project.params
  const urgent = c.urgency === 'urgent'
  const received = c.receivedAt ?? `${c.date}T${String(WORK_START).padStart(2, '0')}:00`
  const measure = (end: string | null | undefined) =>
    end ? (urgent ? clockMinutes(received, end) : businessMinutes(received, end, cal)) : null
  const responseLimit = urgent
    ? (inBusinessHours(received, cal) ? p.urgentResponseHours : p.urgentResponseOffHours) * 60
    : p.normalResponseDays * (WORK_END - WORK_START) * 60
  const solutionLimit = urgent ? p.urgentSolutionHours * 60 : p.normalSolutionDays * (WORK_END - WORK_START) * 60
  const responseMinutes = measure(c.firstResponseAt)
  const solutionMinutes = measure(c.resolvedAt)
  return {
    change: c,
    folio: folio.change(c.seq),
    urgent,
    warranty: isWarrantyDefect(c, data),
    responseMinutes,
    solutionMinutes,
    responseLimit,
    solutionLimit,
    responseOk: responseMinutes == null ? null : responseMinutes <= responseLimit,
    solutionOk: solutionMinutes == null ? null : solutionMinutes <= solutionLimit,
    open: !c.resolvedAt && c.status !== 'done' && c.status !== 'rejected',
  }
}

/** Defecto dentro de la garantía: 60 días naturales después de la aceptación de su hito (valor inicial). */
export function isWarrantyDefect(c: ChangeRequest, data: ProjectData): boolean {
  if (c.kind !== 'defect') return false
  const day = (c.receivedAt ?? c.date).slice(0, 10)
  const days = data.project.params.warrantyDays
  return data.milestones.some((m) => m.actaDate && day >= m.actaDate && day <= addDays(m.actaDate, days))
}

export interface PoolUse {
  folio: string
  description: string
  from: ISODate
  to: ISODate
  hours: number
}

export interface RoutineStatus {
  routine: Routine
  expected: number
  done: number
  runs: RoutineRun[]
  last: RoutineRun | null
  nextDue: ISODate | null
}

export interface MonthlyService {
  month: string
  from: ISODate
  to: ISODate
  requests: RequestTiming[]
  urgent: GroupStats
  normal: GroupStats
  warrantyDefects: RequestTiming[]
  pool: { total: number; used: number; available: number; usedPct: number | null; uses: PoolUse[] }
  routines: RoutineStatus[]
}

export interface GroupStats {
  received: number
  open: number
  avgResponse: number | null
  maxResponse: number | null
  avgSolution: number | null
  maxSolution: number | null
  responseLimit: number
  solutionLimit: number
  complies: boolean
}

function stats(list: RequestTiming[], responseLimit: number, solutionLimit: number): GroupStats {
  const resp = list.map((r) => r.responseMinutes).filter((x): x is number => x != null)
  const sol = list.map((r) => r.solutionMinutes).filter((x): x is number => x != null)
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
  return {
    received: list.length,
    open: list.filter((r) => r.open).length,
    avgResponse: avg(resp),
    maxResponse: resp.length ? Math.max(...resp) : null,
    avgSolution: avg(sol),
    maxSolution: sol.length ? Math.max(...sol) : null,
    responseLimit,
    solutionLimit,
    complies: list.every((r) => r.responseOk !== false && r.solutionOk !== false),
  }
}

/** Cuántas veces toca una rutina en el mes, desde el arranque del servicio. */
export function expectedRuns(r: Routine, from: ISODate, to: ISODate, serviceStart: ISODate | null): number {
  const start = serviceStart && serviceStart > from ? serviceStart : from
  if (start > to) return 0
  const days = Math.round((toUTC(to) - toUTC(start)) / 86_400_000) + 1
  switch (r.frequency) {
    case 'continuous':
      return 0
    case 'daily':
      return days
    case 'weekly':
      return Math.max(1, Math.round(days / 7))
    case 'monthly':
      return 1
    case 'bimonthly':
    case 'quarterly': {
      if (!serviceStart) return 1
      const every = r.frequency === 'bimonthly' ? 2 : 3
      const [sy, sm] = serviceStart.split('-').map(Number)
      const [y, m] = from.split('-').map(Number)
      const diff = (y - sy) * 12 + (m - sm)
      return diff >= 0 && diff % every === 0 ? 1 : 0
    }
  }
}

const FREQ_DAYS: Record<Routine['frequency'], number> = { continuous: 0, daily: 1, weekly: 7, monthly: 30, bimonthly: 61, quarterly: 91 }

export function monthlyService(data: ProjectData, month: string): MonthlyService {
  const cal = new BusinessCalendar(data.project.nonWorkingDays)
  const { from, to } = monthRange(month)
  const p = data.project.params
  const service = data.changes.filter((c) => c.service)
  const inMonth = service.filter((c) => monthOf(c.receivedAt ?? c.date) === month)
  const timings = inMonth.map((c) => requestTiming(c, data, cal))
  const urgent = timings.filter((t) => t.urgent)
  const normal = timings.filter((t) => !t.urgent)

  // Bolsa de horas: ajustes y mejoras de servicio; los defectos y la garantía no descuentan.
  const poolFolios = new Map(
    service.filter((c) => c.kind === 'minor_adjustment' || c.kind === 'scope_change').map((c) => [folio.change(c.seq), c]),
  )
  const usesMap = new Map<string, PoolUse>()
  for (const l of data.workLogs) {
    if (!l.relatedFolio || !poolFolios.has(l.relatedFolio) || l.mark === 'warranty') continue
    if (l.date < from || l.date > to || l.hours == null) continue
    const u = usesMap.get(l.relatedFolio) ?? {
      folio: l.relatedFolio,
      description: poolFolios.get(l.relatedFolio)!.description,
      from: l.date,
      to: l.date,
      hours: 0,
    }
    u.hours += l.hours
    if (l.date < u.from) u.from = l.date
    if (l.date > u.to) u.to = l.date
    usesMap.set(l.relatedFolio, u)
  }
  const uses = [...usesMap.values()].sort((a, b) => a.from.localeCompare(b.from))
  const used = uses.reduce((s, u) => s + u.hours, 0)
  const total = p.monthlyPoolHours

  const routines = data.routines
    .filter((r) => r.active)
    .map((r) => {
      const runs = data.routineRuns.filter((x) => x.routineId === r.id && x.date >= from && x.date <= to)
      const all = data.routineRuns.filter((x) => x.routineId === r.id && x.done).sort((a, b) => a.date.localeCompare(b.date))
      const last = all[all.length - 1] ?? null
      const nextDue = r.frequency === 'continuous' ? null : last ? addDays(last.date, FREQ_DAYS[r.frequency]) : (p.serviceStart ?? null)
      return { routine: r, expected: expectedRuns(r, from, to, p.serviceStart), done: runs.filter((x) => x.done).length, runs, last, nextDue }
    })

  const responseUrgent = p.urgentResponseHours * 60
  const responseNormal = p.normalResponseDays * (WORK_END - WORK_START) * 60
  return {
    month,
    from,
    to,
    requests: timings,
    urgent: stats(urgent, responseUrgent, p.urgentSolutionHours * 60),
    normal: stats(normal, responseNormal, p.normalSolutionDays * (WORK_END - WORK_START) * 60),
    warrantyDefects: timings.filter((t) => t.warranty),
    pool: { total, used, available: total - used, usedPct: total ? used / total : null, uses },
    routines,
  }
}

/** Texto de una duración en minutos: «40 minutos», «3 horas», «1 día hábil». */
export function fmtMinutes(min: number | null, businessDay = false): string {
  if (min == null) return '—'
  if (min < 60) return `${min} minutos`
  if (businessDay && min >= (WORK_END - WORK_START) * 60) {
    const d = Math.round((min / ((WORK_END - WORK_START) * 60)) * 10) / 10
    return `${d} ${d === 1 ? 'día hábil' : 'días hábiles'}`
  }
  const h = Math.round((min / 60) * 10) / 10
  return `${h} ${h === 1 ? 'hora' : 'horas'}${businessDay ? ' hábiles' : ''}`
}
