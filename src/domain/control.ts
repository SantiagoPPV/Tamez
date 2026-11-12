/**
 * Motor de cálculo de la hoja de control (ESPEC.md, secciones 1 a 3).
 *
 * Una función pura: recibe todo lo capturado en un proyecto y la fecha de corte, y
 * devuelve cada cifra calculada, los once indicadores con su semáforo y las alertas
 * de cada renglón. Las referencias entre corchetes ([B104], [AJ]) son las celdas de la
 * hoja que cada cálculo replica.
 */
import { BusinessCalendar, addDays, diffDays, maxDate, minDate, todayInMexico } from './dates'
import type { ISODate } from './dates'
import { fmtHours, fmtInt, fmtMoney, fmtPct, folio, roundExcel } from './format'
import type {
  ActivityType,
  ChangeRequest,
  Invoice,
  Light,
  Milestone,
  Params,
  ProjectData,
  Risk,
  SnapshotKey,
  SnapshotLights,
  SnapshotValues,
  WbsItem,
  WorkLog,
} from './types'

/* ------------------------------------------------------------------ tipos */

export interface WorkLogCalc {
  folio: string
  /** Tramo de la clave [M]; null si la clave no existe o está vacía */
  segmentId: string | null
  keyMissing: boolean
  deliverable: string
  block: number | null
  activityType: ActivityType | null
  cost: number | null
  reserveHours: number | null
  poolHours: number | null
  alert: string
}

export interface WbsCalc {
  isActivity: boolean
  rework: number | null
  plannedClassHours: number | null
  progress: 0 | 1 | null
  finishedOn: ISODate | null
  remainingCurrent: number | null
  totalRealHours: number | null
  alert: string
}

export interface MilestoneCalc {
  acceptanceDeadline: ISODate | null
  deviation: number | null
  daysToAccept: number | null
  clientDelayDays: number | null
  minForecast: ISODate | null
  ratingAtCutoff: number | null
  alert: string
}

export interface PendingCalc {
  overdueDays: number | null
  overdueAtCutoff: 0 | 1 | null
  openOverdueDays: number | null
  blockingSegmentId: string | null
  keyMissing: boolean
  segmentOrder: number | null
  segmentDelivered: 0 | 1 | null
}

export interface ChangeCalc {
  folio: string
  realHours: number
  unbilledHours: number
  poolHours: number
  approvedAmount: number
  hoursInWbs: number
  hoursToMove: number
  alert: string
}

export interface RiskCalc {
  folio: string
  reserveHours: number
  alert: string
}

export type InvoiceStatus =
  | 'Por facturar'
  | 'Cobrada'
  | 'Vencida: pausar el siguiente hito'
  | 'Vencida'
  | 'Por cobrar'

export interface InvoiceCalc {
  dueDate: ISODate | null
  daysToCollect: number | null
  status: InvoiceStatus | null
  businessDaysLate: number | null
}

export interface Indicator {
  key: SnapshotKey | 'training'
  number: number | null
  label: string
  /** null = «Sin dato» */
  value: number | null
  format: 'index' | 'pct' | 'int' | 'hours'
  light: Light
  detail: string
  yellow: string
  red: string
  frequency: string
  owner: string
  action: string
}

export interface SegmentProgress {
  segmentId: string
  name: string
  plannedHours: number
  plannedToDate: number
  earned: number
  plannedPct: number | null
  earnedPct: number | null
  vsPlan: number | null
  realHours: number
  remaining: number
  plannedDelivery: ISODate | null
  forecastDelivery: ISODate | null
  actualDelivery: ISODate | null
  deviation: number | null
  correctionBudget: number
  correctionHours: number
  correctionToReserve: number
  rework: number | null
}

export interface WeekLoad {
  week: number
  from: ISODate
  to: ISODate
  perPerson: { memberId: string; planned: number; real: number }[]
  light: Light
}

export interface CalibrationRow {
  activityType: ActivityType | 'total'
  estimated: number
  real: number
  efficiency: number | null
  advice: string
}

export interface ControlResult {
  cutoff: ISODate
  workLogs: Map<string, WorkLogCalc>
  wbs: Map<string, WbsCalc>
  milestones: Map<string, MilestoneCalc>
  pendings: Map<string, PendingCalc>
  changes: Map<string, ChangeCalc>
  risks: Map<string, RiskCalc>
  invoices: Map<string, InvoiceCalc>
  /** Bloque 1: comprobaciones */
  paymentsSum: number
  paymentsCheck: string
  baselineCheck: string
  /** Bloque 2: presupuesto interno D11 */
  budget: {
    plannedHours: number
    reserveHours: number
    poolHours: number
    budgetedHours: number
    plannedCost: number
    reserveCost: number
    poolCost: number
    hoursCost: number
    directCosts: number
    totalCost: number
    currentPrice: number
    expectedMargin: number
    expectedMarginPct: number | null
    marginAlertPct: number | null
    minMarginCheck: string
    byBlock: { block: number; planned: number; real: number }[]
  }
  /** Bloque 3: seguimiento al corte D11 */
  tracking: {
    hours: { planned: number; real: number; toGo: number; projected: number }
    hoursCost: { planned: number; real: number; toGo: number; projected: number }
    directCosts: { planned: number; real: number; toGo: number; projected: number }
    totalCost: { planned: number; real: number; toGo: number; projected: number }
    expectedMargin: number
    expectedMarginPct: number | null
    projectedMargin: number
    projectedMarginPct: number | null
    marginDiff: number | null
    trainingCap: number
    trainingCost: number
    marginWithTrainingPct: number | null
  }
  /** Bloque 4: de dónde sale cada cifra */
  figures: {
    plannedClassHours: number
    correctionHours: number
    minorAdjustmentHours: number
    unplannedHours: number
    realHours: number
    trainingHours: number
    reserveUsed: number
    reserveBalance: number
    reserveUsedPct: number | null
    poolUsed: number
    poolBalance: number
    poolUsedPct: number | null
    poolWarning: string
    earned: number
    plannedValue: number
    pendingPlanned: number
    pendingReestimated: number
    balancesToAdd: number
    estimateToComplete: number
    projectedHours: number
    realHoursCost: number
    directCostsPaid: number
    realCost: number
    collected: number
    realCostMinusCollected: number
    clientDefects: number
    internalDefects: number
    scopeChanges: number
    approvedChangesAmount: number
    unbilledHours: number
  }
  indicators: Indicator[]
  generalLight: Light
  segments: SegmentProgress[]
  billing: { invoiced: number; collected: number; receivable: number; overdueInvoices: number }
  weeklyLoad: WeekLoad[]
  calibration: CalibrationRow[]
  snapshot: { values: SnapshotValues; lights: SnapshotLights }
}

/* --------------------------------------------------------------- utilidades */

const sum = (xs: Iterable<number | null | undefined>) => {
  let s = 0
  for (const x of xs) if (typeof x === 'number' && !Number.isNaN(x)) s += x
  return s
}

const isAct = (w: WbsItem) => w.rowClass === 'activity' || w.rowClass === 'subactivity'

function lightBelow(v: number | null, yellow: number, red: number): Light {
  if (v == null) return 'none'
  if (v < red) return 'red'
  if (v < yellow) return 'yellow'
  return 'green'
}

function lightAtLeast(v: number | null, yellow: number, red: number): Light {
  if (v == null) return 'none'
  if (v >= red) return 'red'
  if (v >= yellow) return 'yellow'
  return 'green'
}

function div(a: number, b: number): number | null {
  return b === 0 ? null : a / b
}

const ALERTS = {
  hasSubactivities: 'Tiene subactividades: pásalo a clase Entregable',
  overCap: 'Pasa del tope de horas por actividad (Indicadores B28): partir la actividad',
  selfReview: 'Nadie revisa su propio trabajo',
  doneWithoutRule: 'Terminado sin lista, revisión, fecha de revisión o fecha real al corte',
  setDone: 'Cambiar el estado a terminado',
  missingEvidence: 'Falta evidencia en la Bitácora',
  hoursInActivities: 'Las horas van en las actividades',
  shiftForecast: 'Recorrer la fecha prevista: retraso del cliente (causa Cliente)',
  noCorrectionBudget: 'Hito sin horas planeadas para corregir (columna AL)',
} as const

/* ------------------------------------------------------------------ motor */

export function computeControl(data: ProjectData, cutoffOverride?: ISODate): ControlResult {
  const { project } = data
  const p: Params = project.params
  const cutoff = cutoffOverride ?? project.cutoffDate ?? todayInMexico()
  const cal = new BusinessCalendar(project.nonWorkingDays)
  const est = p.estHourlyCost ?? 0
  const dec = p.indexDecimals

  const segments = [...data.segments].sort((a, b) => a.position - b.position)
  const segOrder = new Map(segments.map((s, i) => [s.id, i + 1]))
  const wbs = [...data.wbs].sort((a, b) => a.position - b.position)
  const logs = [...data.workLogs].sort((a, b) => a.seq - b.seq)
  const members = new Map(data.members.map((m) => [m.id, m]))

  // Claves: la primera coincidencia gana (MATCH).
  type KeyRef = { kind: 'wbs'; item: WbsItem } | { kind: 'milestone'; item: Milestone }
  const keys = new Map<string, KeyRef>()
  for (const m of data.milestones) if (m.key && !keys.has(m.key)) keys.set(m.key, { kind: 'milestone', item: m })
  for (const w of wbs) if (w.key && !keys.has(w.key)) keys.set(w.key, { kind: 'wbs', item: w })
  const segmentOfKey = (key: string | null | undefined): string | null | undefined => {
    if (!key) return undefined
    const ref = keys.get(key)
    if (!ref) return undefined
    return ref.item.segmentId
  }

  const changeFolios = new Map(data.changes.map((c) => [folio.change(c.seq), c]))
  const riskFolios = new Map(data.risks.map((r) => [folio.risk(r.seq), r]))
  const milestoneBySegment = new Map<string, Milestone[]>()
  for (const m of data.milestones) {
    const arr = milestoneBySegment.get(m.segmentId) ?? []
    arr.push(m)
    milestoneBySegment.set(m.segmentId, arr)
  }

  // Bloque 6, N: horas planeadas para corregir por tramo (actividades con AL = Sí).
  const correctionBudgetBySegment = new Map<string, number>()
  for (const w of wbs) {
    if (w.correctionBudget && w.segmentId) {
      correctionBudgetBySegment.set(
        w.segmentId,
        (correctionBudgetBySegment.get(w.segmentId) ?? 0) + (w.estimatedHours ?? 0),
      )
    }
  }

  const inCut = (d: ISODate | null | undefined) => !!d && d <= cutoff
  const notTraining = (l: WorkLog) => l.mark !== 'training'

  /* -------------------------------------------- Bitácora de trabajo (1.2) */
  const workLogs = new Map<string, WorkLogCalc>()
  const cumCorrection = new Map<string, number>()
  for (const l of logs) {
    const ref = l.activityKey ? keys.get(l.activityKey) : undefined
    const keyMissing = !!l.activityKey && !ref
    const segmentId = ref ? ref.item.segmentId : null
    const segKey = keyMissing ? '__missing__' : (segmentId ?? '')
    const wItem = ref?.kind === 'wbs' ? ref.item : null
    const member = l.personId ? members.get(l.personId) : undefined
    const memberCost = member?.hourlyCost ?? 0
    const cost = l.hours == null ? null : l.hours * (memberCost > 0 ? memberCost : est)

    let reserveHours: number | null = null
    let poolHours: number | null = null
    if (l.hours != null) {
      // [R] reserva: imprevisto, corrección con garantía y la parte de una corrección que
      // pasa de lo planeado para corregir del tramo (acumulado de arriba hacia abajo).
      if (l.hourClass === 'correction' && l.mark !== 'warranty') {
        cumCorrection.set(segKey, (cumCorrection.get(segKey) ?? 0) + l.hours)
      }
      if (l.hourClass === 'unplanned' || (l.hourClass === 'correction' && l.mark === 'warranty')) {
        reserveHours = l.hours
      } else if (l.hourClass === 'correction') {
        const budget = segmentId ? (correctionBudgetBySegment.get(segmentId) ?? 0) : 0
        reserveHours = Math.max(0, Math.min(l.hours, (cumCorrection.get(segKey) ?? 0) - budget))
      } else {
        reserveHours = 0
      }
      poolHours = l.hourClass === 'minor_adjustment' ? l.hours : 0
    }

    // [T] alertas, la primera que aplica
    let alert = ''
    if (!l.personId || !l.activityKey || l.hours == null || !l.hourClass) alert = 'Faltan datos'
    else if (!l.description.trim()) alert = 'Falta qué se hizo'
    else if (keyMissing) alert = 'Clave no existe'
    else if (!wItem || !isAct(wItem)) alert = 'La clave no es una actividad'
    else if (l.relatedFolio && !changeFolios.has(l.relatedFolio) && !riskFolios.has(l.relatedFolio))
      alert = 'Folio relacionado no existe'
    else if (
      !l.relatedFolio &&
      (l.hourClass === 'minor_adjustment' ||
        l.hourClass === 'unplanned' ||
        l.mark === 'warranty' ||
        (reserveHours ?? 0) > 0)
    )
      alert = 'Falta folio relacionado'
    else if (!l.relatedFolio && l.hourClass === 'correction') {
      const delivered = sum((milestoneBySegment.get(segmentId ?? '') ?? []).map((m) => m.actualDelivery ? 1 : 0))
      const deliveredOn = maxDate(...(milestoneBySegment.get(segmentId ?? '') ?? []).map((m) => m.actualDelivery))
      if (delivered > 0 && deliveredOn && l.date > deliveredOn) alert = '¿Defecto del cliente? Falta folio relacionado'
    }
    if (!alert && member && !(member.hourlyCost && member.hourlyCost > 0))
      alert = 'Falta costo por hora de la persona (se usa B17)'

    workLogs.set(l.id, {
      folio: folio.workLog(l.seq),
      segmentId: keyMissing ? null : segmentId,
      keyMissing,
      deliverable: wItem?.deliverable ?? '',
      block: wItem?.block ?? null,
      activityType: wItem?.activityType ?? null,
      cost,
      reserveHours,
      poolHours,
      alert,
    })
  }
  const logCalc = (l: WorkLog) => workLogs.get(l.id)!
  const cutLogs = logs.filter((l) => inCut(l.date))
  const cutWorkLogs = cutLogs.filter(notTraining)

  /* ----------------------------------------- Pendientes del cliente (1.6) */
  const pendings = new Map<string, PendingCalc>()
  for (const pe of data.pendings) {
    let overdueDays: number | null = null
    if (pe.description && pe.dueOn && !(pe.requestedOn && pe.requestedOn > cutoff)) {
      const end = pe.receivedOn && pe.receivedOn <= cutoff ? pe.receivedOn : cutoff
      overdueDays = Math.max(0, cal.networkDays(pe.dueOn, end) - 1)
    }
    const overdueAtCutoff: 0 | 1 | null =
      overdueDays == null
        ? null
        : (!pe.receivedOn || pe.receivedOn > cutoff) && overdueDays > 0
          ? 1
          : 0
    const seg = segmentOfKey(pe.blocksKey)
    const keyMissing = !!pe.blocksKey && seg === undefined
    const blockingSegmentId = seg ?? null
    const segmentOrder = blockingSegmentId ? (segOrder.get(blockingSegmentId) ?? null) : null
    let segmentDelivered: 0 | 1 | null = null
    if (segmentOrder != null && blockingSegmentId) {
      segmentDelivered = (milestoneBySegment.get(blockingSegmentId) ?? []).some((m) => inCut(m.actualDelivery))
        ? 1
        : 0
    }
    pendings.set(pe.id, {
      overdueDays,
      overdueAtCutoff,
      openOverdueDays: overdueAtCutoff === 1 ? overdueDays : null,
      blockingSegmentId,
      keyMissing,
      segmentOrder,
      segmentDelivered,
    })
  }

  /* ------------------------------------------------------- Desglose (1.1) */
  const wbsCalc = new Map<string, WbsCalc>()
  const evidenceKeys = new Set(logs.filter((l) => l.evidence.trim()).map((l) => l.activityKey))
  for (const w of wbs) {
    if (!isAct(w)) {
      wbsCalc.set(w.id, {
        isActivity: false,
        rework: null,
        plannedClassHours: null,
        progress: null,
        finishedOn: null,
        remainingCurrent: null,
        totalRealHours: null,
        alert: w.estimatedHours != null ? ALERTS.hoursInActivities : '',
      })
      continue
    }
    const mine = cutLogs.filter((l) => l.activityKey === w.key)
    const rework = sum(mine.filter((l) => l.hourClass === 'correction').map((l) => l.hours))
    const plannedClassHours = sum(mine.filter((l) => l.hourClass === 'planned' && notTraining(l)).map((l) => l.hours))
    const totalRealHours = sum(mine.filter(notTraining).map((l) => l.hours))
    // [AH] Terminado el: la regla del 100 %
    const finishedOn =
      w.checklistComplete === true &&
      w.reviewerId &&
      w.reviewerId !== w.ownerId &&
      w.actualEndDate &&
      w.reviewDate
        ? maxDate(w.actualEndDate, w.reviewDate)
        : null
    const progress: 0 | 1 = finishedOn && finishedOn <= cutoff ? 1 : 0
    const remainingCurrent = finishedOn
      ? w.estimatedHours
      : w.remainingHours == null
        ? w.estimatedHours
        : w.remainingHours

    // [AJ]
    let alert = ''
    const hasSubs =
      w.rowClass === 'activity' &&
      (w.estimatedHours ?? 0) > 0 &&
      wbs.some((o) => o.rowClass === 'subactivity' && o.key.length > w.key.length && o.key.startsWith(w.key))
    if (hasSubs) alert = ALERTS.hasSubactivities
    else if ((w.estimatedHours ?? 0) > p.maxActivityHours) alert = ALERTS.overCap
    else if (w.reviewerId && w.reviewerId === w.ownerId) alert = ALERTS.selfReview
    else if (w.status === 'done' && progress !== 1) alert = ALERTS.doneWithoutRule
    else if (progress === 1 && w.status !== 'done') alert = ALERTS.setDone
    else if (finishedOn && !evidenceKeys.has(w.key)) alert = ALERTS.missingEvidence

    wbsCalc.set(w.id, {
      isActivity: true,
      rework,
      plannedClassHours,
      progress,
      finishedOn,
      remainingCurrent,
      totalRealHours,
      alert,
    })
  }
  const wc = (w: WbsItem) => wbsCalc.get(w.id)!
  const acts = wbs.filter(isAct)

  /* ------------------------------------------------- Filas de hito (1.1) */
  const milestones = new Map<string, MilestoneCalc>()
  for (const m of data.milestones) {
    const order = segOrder.get(m.segmentId) ?? 0
    let clientDelayDays: number | null = null
    let minForecast: ISODate | null = null
    let deviation: number | null = null
    if (m.plannedDelivery) {
      // [AO] días vencidos de pendientes que bloquean este tramo o uno anterior aún no entregado
      clientDelayDays = sum(
        data.pendings.map((pe) => {
          const pc = pendings.get(pe.id)!
          return pc.segmentOrder != null && pc.segmentOrder <= order && pc.segmentDelivered === 0
            ? pc.overdueDays
            : 0
        }),
      )
      minForecast = cal.workday(m.plannedDelivery, clientDelayDays)
      // [AF]
      if (inCut(m.actualDelivery)) deviation = cal.deviation(m.plannedDelivery, m.actualDelivery!)
      else deviation = cal.deviation(m.plannedDelivery, maxDate(m.forecastDelivery, minForecast)!)
    }
    // [AG]
    let daysToAccept: number | null = null
    if (inCut(m.actualDelivery)) {
      daysToAccept = inCut(m.actaDate)
        ? cal.networkDays(m.actualDelivery!, m.actaDate!) - 1
        : cal.networkDays(m.actualDelivery!, cutoff) - 1
    }
    let alert = ''
    if (
      (!m.actualDelivery || m.actualDelivery > cutoff) &&
      (clientDelayDays ?? 0) > 0 &&
      (!m.forecastDelivery || (minForecast !== null && m.forecastDelivery < minForecast))
    )
      alert = ALERTS.shiftForecast
    else if (!wbs.some((w) => w.segmentId === m.segmentId && w.correctionBudget)) alert = ALERTS.noCorrectionBudget

    milestones.set(m.id, {
      acceptanceDeadline: m.actualDelivery ? cal.workday(m.actualDelivery, p.clientReviewDays) : null,
      deviation,
      daysToAccept,
      clientDelayDays,
      minForecast,
      ratingAtCutoff: m.clientRating != null && m.actaDate && m.actaDate <= cutoff ? m.clientRating : null,
      alert,
    })
  }

  /* -------------------------------------------------------- Cambios (1.4) */
  const changes = new Map<string, ChangeCalc>()
  for (const c of data.changes) {
    const f = folio.change(c.seq)
    const withFolio = cutLogs.filter((l) => l.relatedFolio === f)
    const realHours = sum(withFolio.map((l) => l.hours))
    const isScope = c.kind === 'scope_change'
    const unbilledHours = isScope && c.billing !== 'yes' && c.billing !== 'pool' ? realHours : 0
    const poolHours =
      isScope && c.billing === 'pool'
        ? sum(withFolio.filter((l) => l.hourClass !== 'minor_adjustment').map((l) => l.hours))
        : 0
    const approvedAmount =
      isScope &&
      c.billing === 'yes' &&
      (c.status === 'approved' || c.status === 'in_baseline' || c.status === 'done') &&
      inCut(c.responseDate)
        ? (c.amount ?? 0)
        : 0
    const hoursInWbs = sum(wbs.filter((w) => w.changeFolio === f).map((w) => w.estimatedHours))
    const hoursToMove = approvedAmount > 0 ? Math.max(0, (c.hours ?? 0) - hoursInWbs) : 0
    let alert = ''
    const small = c.kind === 'defect' || c.kind === 'minor_adjustment'
    if (c.kind === 'minor_adjustment' && (c.hours ?? 0) >= p.scopeChangeFromHours)
      alert = `De ${fmtInt(p.scopeChangeFromHours)} h o más: es cambio de alcance (D05)`
    else if (small && (c.amount ?? 0) > 0) alert = 'El monto va en cero'
    else if (small && c.status && c.status !== 'in_review' && c.status !== 'done')
      alert = 'Ese estado es solo de cambio de alcance'
    else if (isScope && (c.status === 'approved' || c.status === 'rejected') && !c.decidedById)
      alert = 'Falta quién aprobó o rechazó'
    else if (hoursToMove > 0) alert = 'Aprobado: faltan sus actividades en el Desglose (columna AM)'
    changes.set(c.id, { folio: f, realHours, unbilledHours, poolHours, approvedAmount, hoursInWbs, hoursToMove, alert })
  }

  /* ------------------------------------------- Riesgos e incidentes (1.5) */
  const risks = new Map<string, RiskCalc>()
  for (const r of data.risks) {
    const f = folio.risk(r.seq)
    risks.set(r.id, {
      folio: f,
      reserveHours: sum(cutLogs.filter((l) => l.relatedFolio === f).map((l) => logCalc(l).reserveHours)),
      alert: r.status !== 'closed' && r.commitmentDate && r.commitmentDate < cutoff ? 'Compromiso vencido' : '',
    })
  }

  /* ------------------------------------------------- Cobranza (bloque 7) */
  const invoices = new Map<string, InvoiceCalc>()
  for (const inv of data.invoices) {
    const dueDate = inv.invoiceDate ? addDays(inv.invoiceDate, p.creditDays ?? 0) : null
    const issued = inCut(inv.invoiceDate)
    const paid = inCut(inv.paidDate)
    const daysToCollect = !issued ? null : diffDays(inv.invoiceDate!, paid ? inv.paidDate! : cutoff)
    let businessDaysLate: number | null = null
    if (issued && dueDate) {
      if (paid) businessDaysLate = inv.paidDate! > dueDate ? cal.networkDays(dueDate, inv.paidDate!) - 1 : 0
      else businessDaysLate = cutoff > dueDate ? cal.networkDays(dueDate, cutoff) - 1 : 0
    }
    let status: InvoiceStatus | null = null
    if (inv.amount != null) {
      if (!issued) status = 'Por facturar'
      else if (paid) status = 'Cobrada'
      else if (dueDate && cutoff > dueDate)
        status = (businessDaysLate ?? 0) >= p.pauseAfterOverdueDays ? 'Vencida: pausar el siguiente hito' : 'Vencida'
      else status = 'Por cobrar'
    }
    invoices.set(inv.id, { dueDate, daysToCollect, status, businessDaysLate })
  }
  const billing = {
    invoiced: sum(data.invoices.filter((i) => inCut(i.invoiceDate)).map((i) => i.amount)),
    collected: sum(data.invoices.filter((i) => inCut(i.paidDate)).map((i) => i.amount)),
    receivable: 0,
    overdueInvoices: [...invoices.values()].filter((i) => i.status?.startsWith('Vencida')).length,
  }
  billing.receivable = billing.invoiced - billing.collected

  /* ------------------------------------- Bloque 2: presupuesto interno */
  const plannedHours = sum(acts.map((w) => w.estimatedHours))
  const reserveHours = roundExcel(plannedHours * p.reservePct, 0)
  const poolHours = roundExcel(plannedHours * p.poolPct, 0)
  const budgetedHours = plannedHours + reserveHours + poolHours
  const directCosts = p.directCostsBudget ?? 0
  const approvedChangesAmount = sum([...changes.values()].map((c) => (c.approvedAmount > 0 ? c.approvedAmount : 0)))
  const currentPrice = (p.price ?? 0) + approvedChangesAmount
  const totalBudgetCost = budgetedHours * est + directCosts
  const expectedMargin = currentPrice - totalBudgetCost
  const expectedMarginPct = div(expectedMargin, currentPrice)
  const marginAlertPct = expectedMarginPct == null ? null : expectedMarginPct - p.marginDropYellow
  const minMarginCheck =
    p.minMargin == null
      ? 'Margen mínimo por definir'
      : expectedMarginPct == null
        ? ''
        : expectedMarginPct < p.minMargin
          ? 'Bajo el mínimo: no se firma la línea base'
          : 'Cumple el mínimo'
  const blockOfKey = (key: string) => {
    const ref = keys.get(key)
    return ref?.kind === 'wbs' ? ref.item.block : null
  }
  const byBlock = Array.from({ length: 9 }, (_, i) => i + 1).map((block) => ({
    block,
    planned: sum(wbs.filter((w) => w.block === block).map((w) => w.estimatedHours)),
    real: sum(cutWorkLogs.filter((l) => blockOfKey(l.activityKey) === block).map((l) => l.hours)),
  }))

  /* -------------------------------- Bloque 4: de dónde sale cada cifra */
  const byClass = (c: WorkLog['hourClass']) => sum(cutWorkLogs.filter((l) => l.hourClass === c).map((l) => l.hours))
  const realHours = sum(cutWorkLogs.map((l) => l.hours))
  const trainingHours = sum(cutLogs.filter((l) => l.mark === 'training').map((l) => l.hours))
  const reserveUsed = sum(cutLogs.map((l) => logCalc(l).reserveHours))
  const reserveBalance = reserveHours - reserveUsed
  const poolUsed =
    sum(cutLogs.map((l) => logCalc(l).poolHours)) +
    sum([...changes.values()].map((c) => (c.poolHours > 0 ? c.poolHours : 0)))
  const poolBalance = poolHours - poolUsed
  const reserveUsedPct = div(reserveUsed, reserveHours)
  const poolUsedPct = div(poolUsed, poolHours)
  const earned = sum(wbs.filter((w) => inCut(wbsCalc.get(w.id)?.finishedOn)).map((w) => w.estimatedHours))
  const plannedValue = sum(acts.filter((w) => inCut(w.plannedDate)).map((w) => w.estimatedHours))
  const allRemaining = sum(acts.map((w) => wc(w).remainingCurrent).filter((x): x is number => x != null && x >= 0))
  const finishedRemaining = sum(acts.filter((w) => inCut(wc(w).finishedOn)).map((w) => wc(w).remainingCurrent))
  const pendingReestimated =
    allRemaining - finishedRemaining + sum([...changes.values()].map((c) => (c.hoursToMove > 0 ? c.hoursToMove : 0)))
  const balancesToAdd = Math.max(0, reserveBalance) + Math.max(0, poolBalance)
  const estimateToComplete = pendingReestimated + balancesToAdd
  const projectedHours = realHours + estimateToComplete
  const realHoursCost = sum(cutWorkLogs.map((l) => logCalc(l).cost))
  const directCostsPaid = sum(cutLogs.map((l) => l.directCost))
  const realCost = realHoursCost + directCostsPaid
  const clientDefects = data.changes.filter((c) => c.kind === 'defect' && inCut(c.date)).length
  const internalDefects = sum(wbs.filter((w) => inCut(w.reviewDate)).map((w) => w.internalDefects))
  const scopeChanges = data.changes.filter((c) => c.kind === 'scope_change' && inCut(c.date)).length
  const unbilledHours = sum(data.changes.filter((c) => inCut(c.date)).map((c) => changes.get(c.id)!.unbilledHours))
  const correctionHours = byClass('correction')

  /* -------------------------------------- Bloque 3: seguimiento al corte */
  const hoursToGoCost = estimateToComplete * est
  const directToGo = Math.max(0, directCosts - directCostsPaid)
  const projectedCost = realHoursCost + hoursToGoCost + directCostsPaid + directToGo
  const projectedMargin = currentPrice - projectedCost
  const projectedMarginPct = div(projectedMargin, currentPrice)
  const trainingCost = sum(cutLogs.filter((l) => l.mark === 'training').map((l) => logCalc(l).cost))
  const trainingCapHours = plannedHours * p.trainingCapPct

  /* ------------------------------------------------- Bloque 5: tablero */
  const round = (x: number | null) => (x == null ? null : roundExcel(x, dec))
  const progress = round(div(earned, plannedValue))
  const efficiency = round(div(earned, realHours))
  const overdueCount = [...pendings.values()].filter((x) => x.overdueAtCutoff === 1).length
  const maxOpenOverdue = Math.max(0, ...[...pendings.values()].map((x) => x.openOverdueDays ?? 0))
  const withPlanned = data.milestones.filter((m) => m.plannedDelivery)
  const deviation = withPlanned.length
    ? Math.max(...withPlanned.map((m) => milestones.get(m.id)!.deviation ?? 0))
    : null
  const rework = div(correctionHours, realHours)
  const clientDefectsPct = div(clientDefects, clientDefects + internalDefects)
  const acceptDays = [...milestones.values()].map((m) => m.daysToAccept).filter((x): x is number => x != null && x >= 0)
  const daysToAccept = acceptDays.length ? Math.max(...acceptDays) : null
  const ratings = [...milestones.values()].map((m) => m.ratingAtCutoff).filter((x): x is number => x != null && x >= 0)
  const satisfaction = ratings.length ? Math.min(...ratings) : null
  const collectDays = [...invoices.values()].map((i) => i.daysToCollect).filter((x): x is number => x != null && x >= 0)
  const daysToCollect = collectDays.length ? Math.max(...collectDays) : null
  const maxLate = Math.max(0, ...[...invoices.values()].map((i) => i.businessDaysLate ?? 0))

  const marginYellow = marginAlertPct
  const marginRed = expectedMarginPct == null ? null : p.minMargin == null ? expectedMarginPct - p.marginDropRedNoMin : p.minMargin
  const marginLight: Light =
    projectedMarginPct == null
      ? 'none'
      : marginRed != null && projectedMarginPct < marginRed
        ? 'red'
        : marginYellow != null && projectedMarginPct < marginYellow
          ? 'yellow'
          : 'green'

  const progressLight = lightBelow(progress, p.progressYellow, p.progressRed)
  const deviationLight = lightAtLeast(deviation, p.deviationYellowDays, p.deviationRedDays)
  const overdueLight: Light =
    maxOpenOverdue >= p.overdueRedDays ? 'red' : overdueCount >= p.overdueYellowCount ? 'yellow' : 'green'
  const acceptLight: Light =
    daysToAccept == null
      ? 'none'
      : daysToAccept > p.clientReviewDays
        ? 'red'
        : daysToAccept >= p.acceptYellowDays
          ? 'yellow'
          : 'green'
  const collectLight: Light =
    daysToCollect == null ? 'none' : maxLate >= p.collectRedDays ? 'red' : maxLate > 0 ? 'yellow' : 'green'
  const balanceLight = (budget: number, balance: number, pct: number | null): Light =>
    budget === 0 ? 'none' : balance < 0 ? 'red' : (pct ?? 0) >= p.usageWarningPct ? 'yellow' : 'green'

  const generalLight: Light =
    progress == null
      ? 'none'
      : progress < p.progressRed || (deviation != null && deviation >= p.deviationRedDays)
        ? 'red'
        : progress < p.progressYellow ||
            overdueCount >= p.overdueYellowCount ||
            (deviation != null && deviation >= p.deviationYellowDays)
          ? 'yellow'
          : 'green'

  const indicators: Indicator[] = [
    {
      key: 'progress',
      number: 1,
      label: 'Avance contra plan',
      value: progress,
      format: 'index',
      light: progressLight,
      detail: progress == null ? '' : `${fmtHours(earned)} h terminadas / ${fmtHours(plannedValue)} h planeadas a la fecha`,
      yellow: `Debajo de ${p.progressYellow}`,
      red: `Debajo de ${p.progressRed}`,
      frequency: 'Semanal',
      owner: 'Líder de proyecto; viernes',
      action:
        'Ese viernes ubica la actividad atorada; el lunes replanea; si se mueve la fecha prevista de un hito, lo avisa en ese reporte.',
    },
    {
      key: 'efficiency',
      number: 2,
      label: 'Eficiencia de horas',
      value: efficiency,
      format: 'index',
      light: lightBelow(efficiency, p.efficiencyYellow, p.efficiencyRed),
      detail: efficiency == null ? '' : `${fmtHours(earned)} h terminadas / ${fmtHours(realHours)} h reales`,
      yellow: `Debajo de ${p.efficiencyYellow}`,
      red: `Debajo de ${p.efficiencyRed}`,
      frequency: 'Semanal',
      owner: 'Líder de proyecto; viernes',
      action: 'Ese viernes actualiza las horas por terminar de las actividades que más se pasaron.',
    },
    {
      key: 'margin',
      number: 3,
      label: 'Margen proyectado',
      value: projectedMarginPct,
      format: 'pct',
      light: marginLight,
      detail: projectedMarginPct == null ? '' : `Proyectado ${fmtMoney(projectedMargin)} de ${fmtMoney(currentPrice)}`,
      yellow: marginYellow == null ? '' : `Debajo de ${fmtPct(marginYellow)}`,
      red: marginRed == null ? '' : `Debajo de ${fmtPct(marginRed)}`,
      frequency: 'Semanal',
      owner: 'Líder de proyecto; revisan los socios',
      action:
        'Ese viernes los socios deciden cuánto toman de la reserva; lo trabajado fuera de la especificación se detiene hasta tener solicitud de cambio aprobada.',
    },
    {
      key: 'overdue',
      number: 4,
      label: 'Pendientes del cliente vencidos',
      value: overdueCount,
      format: 'int',
      light: overdueLight,
      detail: overdueCount === 0 ? 'Ninguno vencido' : `Máximo ${fmtInt(maxOpenOverdue)} días hábiles vencido`,
      yellow: `Desde ${p.overdueYellowCount}`,
      red: `Con ${p.overdueRedDays} días hábiles vencidos`,
      frequency: 'Semanal',
      owner: 'Líder de proyecto; viernes',
      action:
        'El día del vencimiento escribe al responsable del cliente qué se bloquea; a los 3 días hábiles, Santiago escala a quien decide y paga, con aviso previo.',
    },
    {
      key: 'deviation',
      number: 5,
      label: 'Desviación de hito (días hábiles)',
      value: deviation,
      format: 'int',
      light: deviationLight,
      detail: 'Peor hito: fecha real o prevista contra planeada',
      yellow: `Desde ${p.deviationYellowDays}`,
      red: `Desde ${p.deviationRedDays}`,
      frequency: 'Por hito',
      owner: 'Líder de proyecto',
      action:
        'Avisa al cliente el día en que la fecha prevista rebasa la planeada, con causa y nueva fecha; con alerta, los socios anotan la causa en 2 días hábiles.',
    },
    {
      key: 'rework',
      number: 6,
      label: 'Retrabajo',
      value: rework,
      format: 'pct',
      light: lightAtLeast(rework, p.reworkYellow, p.reworkRed),
      detail: rework == null ? '' : `${fmtHours(correctionHours)} h de corrección / ${fmtHours(realHours)} h reales`,
      yellow: `Desde ${fmtPct(p.reworkYellow)}`,
      red: `Desde ${fmtPct(p.reworkRed)}`,
      frequency: 'Por hito',
      owner: 'Líder de proyecto',
      action: 'Antes del siguiente hito, Revisión de calidad corrige la lista de calidad que falló.',
    },
    {
      key: 'clientDefects',
      number: 7,
      label: 'Defectos que encontró el cliente',
      value: clientDefectsPct,
      format: 'pct',
      light: lightAtLeast(clientDefectsPct, p.clientDefectsYellow, p.clientDefectsRed),
      detail:
        clientDefectsPct == null ? '' : `${fmtInt(clientDefects)} del cliente de ${fmtInt(clientDefects + internalDefects)} defectos`,
      yellow: `Desde ${fmtPct(p.clientDefectsYellow)}`,
      red: `Desde ${fmtPct(p.clientDefectsRed)}`,
      frequency: 'Por hito',
      owner: 'Revisión de calidad',
      action: 'Antes del siguiente hito, Análisis agrega cada defecto del cliente al guion de pruebas.',
    },
    {
      key: 'daysToAccept',
      number: 8,
      label: 'Días para aceptar',
      value: daysToAccept,
      format: 'int',
      light: acceptLight,
      detail: 'Peor hito entregado: aceptado o en espera del acta, en días hábiles',
      yellow: `Desde ${p.acceptYellowDays}`,
      red: `Más de ${p.clientReviewDays}`,
      frequency: 'Por hito',
      owner: 'Líder de proyecto',
      action:
        'Al día 5 hábil recuerda por escrito, con copia a quien decide y paga; vencido el plazo sin observaciones, envía el aviso de aceptación por plazo vencido y se factura.',
    },
    {
      key: 'satisfaction',
      number: 9,
      label: 'Satisfacción',
      value: satisfaction,
      format: 'int',
      light: lightBelow(satisfaction, p.satisfactionYellow, p.satisfactionRed),
      detail: 'Calificación más baja con acta hasta el corte',
      yellow: `Debajo de ${p.satisfactionYellow}`,
      red: `Debajo de ${p.satisfactionRed}`,
      frequency: 'Con cada acta',
      owner: 'Líder de proyecto',
      action: 'Con menos de 9, Santiago llama al responsable del cliente en 3 días hábiles.',
    },
    {
      key: 'daysToCollect',
      number: 10,
      label: 'Días para cobrar (naturales)',
      value: daysToCollect,
      format: 'int',
      light: collectLight,
      detail:
        daysToCollect == null
          ? ''
          : `Factura más lenta o abierta; atraso: ${fmtInt(maxLate)} días hábiles después del vencimiento`,
      yellow: 'Desde el día hábil siguiente al vencimiento',
      red: `${p.collectRedDays} días hábiles de atraso`,
      frequency: 'Por factura',
      owner: 'Socio operativo, mientras se define Administración',
      action:
        'Al día hábil siguiente del vencimiento escribe a quien tramita órdenes y pagos; a los 5 días hábiles, Santiago habla con quien decide y paga.',
    },
    {
      key: 'scopeChanges',
      number: 11,
      label: 'Cambios de alcance',
      value: scopeChanges,
      format: 'int',
      light: unbilledHours > 0 ? 'yellow' : 'green',
      detail: `Monto aprobado ${fmtMoney(approvedChangesAmount)}; ${fmtHours(unbilledHours)} h no cobradas`,
      yellow: 'Sin meta',
      red: 'Sin meta',
      frequency: 'Mensual',
      owner: 'Líder de proyecto; último viernes',
      action: 'Sin meta; con horas no cobradas, los socios revisan la causa el último viernes del mes.',
    },
    {
      key: 'reserveBalance',
      number: null,
      label: 'Saldo de la reserva para imprevistos (h)',
      value: reserveBalance,
      format: 'hours',
      light: balanceLight(reserveHours, reserveBalance, reserveUsedPct),
      detail: reserveHours === 0 ? '' : `${fmtHours(reserveUsed)} de ${fmtInt(reserveHours)} h usadas`,
      yellow: `${fmtPct(p.usageWarningPct)} usado`,
      red: 'Saldo negativo',
      frequency: 'Semanal',
      owner: 'Líder de proyecto',
      action: 'Cada uso lleva en la Bitácora el folio del riesgo o incidente que lo originó.',
    },
    {
      key: 'poolBalance',
      number: null,
      label: 'Saldo de la bolsa de ajustes (h)',
      value: poolBalance,
      format: 'hours',
      light: balanceLight(poolHours, poolBalance, poolUsedPct),
      detail: poolHours === 0 ? '' : `${fmtHours(poolUsed)} de ${fmtInt(poolHours)} h usadas`,
      yellow: `${fmtPct(p.usageWarningPct)} usado`,
      red: 'Saldo negativo',
      frequency: 'Semanal',
      owner: 'Líder de proyecto',
      action: 'El saldo va en horas en el reporte semanal; con 75 % usado se avisa al cliente.',
    },
    {
      key: 'training',
      number: null,
      label: 'Horas de formación (renglón aparte, D11)',
      value: trainingHours,
      format: 'hours',
      light: plannedHours === 0 ? 'none' : trainingHours > trainingCapHours ? 'yellow' : 'green',
      detail: `${fmtHours(trainingHours)} h; costo ${fmtMoney(trainingCost)}; con su costo, el margen proyectado sería ${
        projectedMarginPct == null ? '—' : fmtPct((projectedMargin - trainingCost) / currentPrice)
      }`,
      yellow: `Más de ${fmtHours(trainingCapHours)} h`,
      red: '—',
      frequency: 'Semanal',
      owner: 'Líder de proyecto; revisan los socios',
      action:
        'Arriba del tope, los socios revisan en la revisión del viernes el ritmo de la delegación y lo anotan en Decisiones.',
    },
  ]

  /* ---------------------------------------------- Bloque 6: avance por hito */
  const segmentRows: SegmentProgress[] = segments.map((s) => {
    const sActs = acts.filter((w) => w.segmentId === s.id)
    const planned = sum(sActs.map((w) => w.estimatedHours))
    const plannedToDate = sum(sActs.filter((w) => inCut(w.plannedDate)).map((w) => w.estimatedHours))
    const earnedS = sum(wbs.filter((w) => w.segmentId === s.id && inCut(wc(w).finishedOn)).map((w) => w.estimatedHours))
    const segLogs = cutLogs.filter((l) => logCalc(l).segmentId === s.id)
    const realS = sum(segLogs.filter(notTraining).map((l) => l.hours))
    const remS =
      sum(sActs.map((w) => wc(w).remainingCurrent)) - sum(sActs.filter((w) => inCut(wc(w).finishedOn)).map((w) => wc(w).remainingCurrent))
    const ms = milestoneBySegment.get(s.id) ?? []
    const plannedDelivery = minDate(...ms.map((m) => m.plannedDelivery))
    const forecastDelivery = minDate(...ms.map((m) => m.forecastDelivery))
    const actualDelivery = minDate(...ms.map((m) => m.actualDelivery))
    const corr = segLogs.filter((l) => l.hourClass === 'correction')
    const corrNoWarranty = corr.filter((l) => l.mark !== 'warranty')
    return {
      segmentId: s.id,
      name: s.name,
      plannedHours: planned,
      plannedToDate,
      earned: earnedS,
      plannedPct: div(plannedToDate, planned),
      earnedPct: div(earnedS, planned),
      vsPlan: round(div(earnedS, plannedToDate)),
      realHours: realS,
      remaining: remS,
      plannedDelivery,
      forecastDelivery,
      actualDelivery,
      deviation:
        !plannedDelivery || (!forecastDelivery && !actualDelivery)
          ? null
          : sum(ms.map((m) => milestones.get(m.id)!.deviation)),
      correctionBudget: sum(wbs.filter((w) => w.segmentId === s.id && w.correctionBudget).map((w) => w.estimatedHours)),
      correctionHours: sum(corrNoWarranty.map((l) => l.hours)),
      correctionToReserve: sum(corrNoWarranty.map((l) => logCalc(l).reserveHours)),
      rework: div(sum(corr.map((l) => l.hours)), realS),
    }
  })

  /* ------------------------------------ Bloque 9: carga por persona y semana */
  const weeklyLoad: WeekLoad[] = []
  if (project.startDate) {
    for (let week = 0; week < 20; week++) {
      const from = addDays(project.startDate, week * p.daysPerWeek - p.daysPerWeek)
      const to = addDays(from, p.daysPerWeek - 1)
      const realTo = minDate(to, cutoff)!
      const perPerson = data.members.map((m) => ({
        memberId: m.id,
        planned: sum(
          acts.filter((w) => w.ownerId === m.id && w.plannedDate && w.plannedDate >= from && w.plannedDate <= to).map(
            (w) => w.estimatedHours,
          ),
        ),
        real: sum(logs.filter((l) => l.personId === m.id && l.date >= from && l.date <= realTo).map((l) => l.hours)),
      }))
      const light: Light = perPerson.some((x) => x.real > p.weeklyHoursCap)
        ? 'red'
        : perPerson.some((x) => {
              const m = members.get(x.memberId)
              return x.planned > p.weeklyHoursCap || (m?.weeklyHours != null && x.real > m.weeklyHours)
            })
          ? 'yellow'
          : 'green'
      weeklyLoad.push({ week, from, to, perPerson, light })
    }
  }

  /* ---------------------------------- Bloque 10: calibración por tipo */
  const calibrated = acts.filter(
    (w) => w.block != null && [4, 5, 6].includes(w.block) && w.level !== 'own' && inCut(wc(w).finishedOn),
  )
  const calibRow = (type: ActivityType | 'total', items: WbsItem[]): CalibrationRow => {
    const estimated = sum(items.map((w) => w.estimatedHours))
    const real = sum(items.map((w) => wc(w).plannedClassHours))
    const efficiency = round(div(estimated, real))
    return {
      activityType: type,
      estimated,
      real,
      efficiency,
      advice:
        efficiency == null
          ? ''
          : efficiency < p.efficiencyYellow || efficiency > p.efficiencyUpper
            ? 'Fuera de rango: anotar en D14 con su causa y reestimar sus actividades pendientes'
            : 'En rango',
    }
  }
  const types: ActivityType[] = ['screen', 'integration', 'database', 'report', 'data_load', 'release', 'document']
  const calibration = [
    ...types.map((t) => calibRow(t, calibrated.filter((w) => w.activityType === t))),
    calibRow('total', calibrated),
  ]

  /* -------------------------------------------- Bloque 1: comprobaciones */
  const paymentsSum = (p.initialPayment ?? 0) + sum(data.milestones.map((m) => m.paymentAmount))
  const paymentsCheck =
    p.price == null ? '' : paymentsSum === p.price ? 'Cuadra con el precio' : 'No cuadra con el precio'
  const inBaselineChanges = sum(
    data.changes
      .filter((c) => c.kind === 'scope_change' && (c.status === 'in_baseline' || c.status === 'done'))
      .map((c) => c.hours),
  )
  const baselineCheck =
    project.baselineHours == null
      ? 'Se escribe al firmar'
      : roundExcel(plannedHours - project.baselineHours - inBaselineChanges, dec) === 0
        ? 'Cuadra con el Desglose'
        : 'La línea base cambió sin cambio de alcance aprobado'

  /* -------------------------------------------- Bloque 8: corte semanal */
  const ind = (k: SnapshotKey) => indicators.find((i) => i.key === k)!
  const sv = (k: SnapshotKey): number | 'Sin dato' => {
    const v = ind(k).value
    return v == null ? 'Sin dato' : v
  }
  const snapshotKeys: SnapshotKey[] = [
    'progress',
    'efficiency',
    'margin',
    'overdue',
    'deviation',
    'rework',
    'clientDefects',
    'daysToAccept',
    'satisfaction',
    'daysToCollect',
    'scopeChanges',
    'reserveBalance',
    'poolBalance',
  ]
  const values = Object.fromEntries(snapshotKeys.map((k) => [k, sv(k)])) as SnapshotValues
  values.general = generalLight
  values.realHours = realHours
  values.estimateToComplete = estimateToComplete
  values.projectedCost = projectedCost
  const lights = Object.fromEntries(snapshotKeys.map((k) => [k, ind(k).light])) as SnapshotLights

  return {
    cutoff,
    workLogs,
    wbs: wbsCalc,
    milestones,
    pendings,
    changes,
    risks,
    invoices,
    paymentsSum,
    paymentsCheck,
    baselineCheck,
    budget: {
      plannedHours,
      reserveHours,
      poolHours,
      budgetedHours,
      plannedCost: plannedHours * est,
      reserveCost: reserveHours * est,
      poolCost: poolHours * est,
      hoursCost: budgetedHours * est,
      directCosts,
      totalCost: totalBudgetCost,
      currentPrice,
      expectedMargin,
      expectedMarginPct,
      marginAlertPct,
      minMarginCheck,
      byBlock,
    },
    tracking: {
      hours: { planned: budgetedHours, real: realHours, toGo: estimateToComplete, projected: projectedHours },
      hoursCost: {
        planned: budgetedHours * est,
        real: realHoursCost,
        toGo: hoursToGoCost,
        projected: realHoursCost + hoursToGoCost,
      },
      directCosts: { planned: directCosts, real: directCostsPaid, toGo: directToGo, projected: directCostsPaid + directToGo },
      totalCost: {
        planned: budgetedHours * est + directCosts,
        real: realCost,
        toGo: hoursToGoCost + directToGo,
        projected: projectedCost,
      },
      expectedMargin,
      expectedMarginPct,
      projectedMargin,
      projectedMarginPct,
      marginDiff:
        projectedMarginPct == null || expectedMarginPct == null ? null : projectedMarginPct - expectedMarginPct,
      trainingCap: trainingCapHours * est,
      trainingCost,
      marginWithTrainingPct: div(projectedMargin - trainingCost, currentPrice),
    },
    figures: {
      plannedClassHours: byClass('planned'),
      correctionHours,
      minorAdjustmentHours: byClass('minor_adjustment'),
      unplannedHours: byClass('unplanned'),
      realHours,
      trainingHours,
      reserveUsed,
      reserveBalance,
      reserveUsedPct,
      poolUsed,
      poolBalance,
      poolUsedPct,
      poolWarning: poolUsedPct == null ? '' : poolUsedPct >= p.usageWarningPct ? 'Avisar al cliente' : 'Sin aviso',
      earned,
      plannedValue,
      pendingPlanned: plannedHours - earned,
      pendingReestimated,
      balancesToAdd,
      estimateToComplete,
      projectedHours,
      realHoursCost,
      directCostsPaid,
      realCost,
      collected: billing.collected,
      realCostMinusCollected: realCost - billing.collected,
      clientDefects,
      internalDefects,
      scopeChanges,
      approvedChangesAmount,
      unbilledHours,
    },
    indicators,
    generalLight,
    segments: segmentRows,
    billing,
    weeklyLoad,
    calibration,
    snapshot: { values, lights },
  }
}

/** Siguiente número de folio de una bitácora (máximo + 1). */
export function nextSeq(rows: { seq: number }[]): number {
  return rows.reduce((m, r) => Math.max(m, r.seq), 0) + 1
}

export type { ChangeRequest, Invoice, Risk }
