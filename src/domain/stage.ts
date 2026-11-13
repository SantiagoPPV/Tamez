/**
 * Etapas del cliente (Producción del Excel de consultoría) y sus pasos. La venta confirma
 * el expediente; el pago inicial lo vuelve cliente; las puertas 2 a 5 lo mueven de etapa.
 */
import { STAGE_ORDER } from './catalogs'
import type { ISODate } from './dates'
import type { GateNumber, ProjectData, ProjectStage } from './types'

const approved = (d: ProjectData, n: GateNumber) => d.gates.some((g) => g.gate === n && !g.milestoneId && g.approvedOn)

/** La etapa más avanzada que justifican los datos. */
export function stageFromData(d: ProjectData): ProjectStage {
  const stored = d.project.stage
  if (stored === 'cancelled') return 'cancelled'
  const initialPaid = d.invoices.some((i) => i.concept === 'initial' && i.paidDate)
  if (stored === 'confirmed' && !initialPaid) return 'confirmed'
  const allAccepted = d.milestones.length > 0 && d.milestones.every((m) => m.actaDate)
  if (approved(d, 5)) return d.project.params.monthlyFee ? 'service' : 'closed'
  if (allAccepted && (approved(d, 3) || d.project.baselineSignedOn)) return 'closing'
  if (approved(d, 3) || d.project.baselineSignedOn) return 'execution'
  if (approved(d, 2)) return 'planning'
  return 'start'
}

const rank = (s: ProjectStage) => (s === 'cancelled' ? -1 : STAGE_ORDER.indexOf(s))

/** La etapa que se muestra: la guardada, salvo que los datos ya justifiquen una más adelante. */
export function effectiveStage(d: ProjectData): ProjectStage {
  const fromData = stageFromData(d)
  const stored = d.project.stage
  if (!stored) return fromData
  if (stored === 'cancelled') return stored
  return rank(fromData) > rank(stored) ? fromData : stored
}

/** Si la etapa guardada debe avanzar, la nueva; si no, null. */
export function stageAfterChange(d: ProjectData): ProjectStage | null {
  const next = effectiveStage(d)
  return next !== d.project.stage ? next : null
}

/** Proyectos que ya viven en Operaciones (los confirmados sin pago siguen en el CRM). */
export const inOperations = (stage: ProjectStage) => stage !== 'confirmed'

export interface ProcessStep {
  id: string
  title: string
  detail: string
  done: boolean
  /** Ruta dentro del proyecto o a otra pantalla */
  link: string
  /** Se marca a mano (no hay dato que lo demuestre) */
  manual?: boolean
  doneOn?: ISODate | null
}

const docAt = (d: ProjectData, code: string, statuses: string[]) => d.documents.some((x) => x.code === code && statuses.includes(x.status))

/** Cliente en Inicio: lo del Excel (acta, papeleo, cobro, involucrados, accesos y junta de arranque). */
export function startSteps(d: ProjectData, crmLink: string): ProcessStep[] {
  const marks = d.project.process ?? {}
  const closing = d.project.closing
  const roles = new Set(d.contacts.map((c) => c.roleKey))
  return [
    { id: 'acta', title: 'Acta de inicio firmada por las dos partes', detail: 'La D02 se firma en el portal y queda en el expediente.', done: docAt(d, 'D02', ['signed']), link: 'documentos' },
    {
      id: 'papeleo',
      title: 'Papeleo del cliente',
      detail: 'Confidencialidad, alta de proveedor y orden de compra, o constancia de que no aplican.',
      done: Boolean(closing && (['nda', 'vendor', 'purchaseOrder'] as const).every((k) => closing[k].status !== 'pending')),
      link: crmLink,
    },
    { id: 'cobro', title: 'Factura y cobro del pago inicial', detail: 'Con el pago el prospecto se volvió cliente.', done: d.invoices.some((i) => i.concept === 'initial' && i.paidDate), link: '/cobranza' },
    {
      id: 'interesados',
      title: 'Mapa de interesados',
      detail: 'Quién decide y paga, responsable, sistemas, compras y pagos, y usuarios que prueban, con correo y teléfono.',
      done: roles.has('decides') && roles.has('responsible') && d.contacts.every((c) => c.email),
      link: 'proyecto',
    },
    { id: 'accesos', title: 'Solicitud de accesos e información', detail: 'Pedidos por escrito y con fecha compromiso.', done: d.pendings.length > 0 && d.pendings.every((p) => p.requestedOn && p.dueOn), link: 'pendientes' },
    { id: 'arranque', title: 'Junta de arranque', detail: 'Minuta con plan, reglas de cambios y de aceptación, y calendario de juntas; enviada a los involucrados.', done: docAt(d, 'D17', ['sent', 'signed']) || Boolean(marks.arranque), link: 'documentos' },
  ]
}

/** Cliente en Planeación: diagnóstico y plan firmado (nueve pasos). */
export function planningSteps(d: ProjectData): ProcessStep[] {
  const marks = d.project.process ?? {}
  const m = (id: string) => (marks[id] ? { done: true, doneOn: marks[id] } : { done: false })
  const msIds = new Set(d.milestones.map((x) => x.id))
  const withCriteria = new Set(d.criteria.map((c) => c.milestoneId))
  const acts = d.wbs.filter((w) => w.rowClass !== 'deliverable')
  return [
    { id: 'diagnostico', title: 'Diagnóstico', detail: 'Proceso actual, usuarios, datos, sistemas, integraciones y reglas de su área de sistemas, confirmado por el cliente.', done: docAt(d, 'D18', ['sent', 'signed']), link: 'documentos' },
    {
      id: 'prueba',
      title: 'Prueba técnica de lo más riesgoso',
      detail: 'Antes de prometer fechas; el resultado va a la bitácora de decisiones.',
      ...(d.decisions.some((x) => /prueba t[eé]cnica/i.test(`${x.decision} ${x.why}`)) ? { done: true } : m('prueba')),
      link: 'decisiones',
      manual: true,
    },
    { id: 'diseno', title: 'Diseño de la solución', detail: 'Proceso futuro, prototipo de pantallas clave, datos e integraciones; el cliente vio el prototipo.', ...m('diseno'), link: 'documentos', manual: true },
    { id: 'alcance', title: 'Alcance definitivo', detail: 'Entregables con criterios de aceptación y lo que queda fuera.', done: msIds.size > 0 && [...msIds].every((id) => withCriteria.has(id)), link: 'desglose' },
    {
      id: 'desglose',
      title: 'Desglose del trabajo',
      detail: 'Entregables, actividades y subactividades con horas y responsable; ninguna de más de 16 horas.',
      done: acts.length > 0 && acts.every((w) => (w.estimatedHours ?? 0) > 0 && w.ownerId && (w.estimatedHours ?? 0) <= 16),
      link: 'desglose',
    },
    { id: 'cronograma', title: 'Cronograma', detail: 'Hitos con fecha y fechas de lo que entrega el cliente.', done: d.milestones.length > 0 && d.milestones.every((x) => x.plannedDelivery) && d.pendings.every((p) => p.dueOn), link: 'desglose' },
    { id: 'presupuesto', title: 'Presupuesto interno', detail: 'Horas, costos, reserva para imprevistos y margen esperado (D11).', done: Boolean(d.project.params.price && d.project.params.estHourlyCost && acts.length), link: '' },
    { id: 'calidad', title: 'Plan de calidad, riesgos y calendario de comunicación', detail: 'D12, riesgos con responsable y calendario.', done: docAt(d, 'D12', ['draft', 'sent', 'signed']) && d.risks.length > 0, link: 'documentos' },
    { id: 'definitiva', title: 'Propuesta definitiva y plan firmado', detail: 'Si el alcance o el monto cambian frente a la preliminar, el cliente decide si sigue.', done: docAt(d, 'D03', ['signed']) || Boolean(d.project.baselineSignedOn), link: 'documentos' },
  ]
}
