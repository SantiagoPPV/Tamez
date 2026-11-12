/**
 * Estimación con el desglose estándar (pestaña «Desglose estándar» del manual):
 * unidades × horas base, factor del tamaño en los renglones fijos, y de las horas al precio.
 */
import { BASE_HOURS, PROJECT_SIZE } from './catalogs'
import { roundExcel } from './format'
import type {
  ActivityType,
  BaseHoursTable,
  EstimateUnits,
  HatName,
  Level,
  ProjectSize,
  ProposalPayment,
  TemplateRow,
  UnitKey,
  WbsTemplate,
} from './types'

export const UNIT_LABELS: Record<UnitKey, string> = {
  weeks: 'Semanas del proyecto',
  milestones: 'Hitos',
  invoices: 'Facturas (pago inicial y una por hito)',
  sites: 'Sitios o áreas (almacén, sucursal, planta)',
  groups: 'Grupos de capacitación',
  technicalRisks: 'Riesgos técnicos (prueba técnica)',
  keyScreens: 'Pantallas clave del prototipo',
  connections: 'Conexiones con otros sistemas',
  screensSimple: 'Pantallas simples',
  screensMedium: 'Pantallas medias',
  screensComplex: 'Pantallas complejas',
  rules: 'Reglas de negocio de más de una pantalla',
  reportsSimple: 'Reportes simples',
  reportsMedium: 'Reportes medios',
  reportsComplex: 'Reportes complejos',
  dbChanges: 'Cambios de base de datos',
  exchangesSimple: 'Intercambios simples',
  exchangesMedium: 'Intercambios medios',
  exchangesComplex: 'Intercambios complejos',
  followWeeks: 'Semanas de acompañamiento',
}

export const ZERO_UNITS: EstimateUnits = {
  weeks: 0,
  milestones: 0,
  invoices: 0,
  sites: 0,
  groups: 0,
  technicalRisks: 0,
  keyScreens: 0,
  connections: 0,
  screensSimple: 0,
  screensMedium: 0,
  screensComplex: 0,
  rules: 0,
  reportsSimple: 0,
  reportsMedium: 0,
  reportsComplex: 0,
  dbChanges: 0,
  exchangesSimple: 0,
  exchangesMedium: 0,
  exchangesComplex: 0,
  followWeeks: 0,
}

/** Las unidades de CE-INV: 13 semanas, 3 hitos, 3 almacenes, 13 pantallas, una conexión con dos intercambios. */
export const CEINV_UNITS: EstimateUnits = {
  weeks: 13,
  milestones: 3,
  invoices: 4,
  sites: 3,
  groups: 4,
  technicalRisks: 1,
  keyScreens: 6,
  connections: 1,
  screensSimple: 6,
  screensMedium: 6,
  screensComplex: 1,
  rules: 7,
  reportsSimple: 3,
  reportsMedium: 1,
  reportsComplex: 0,
  dbChanges: 3,
  exchangesSimple: 1,
  exchangesMedium: 1,
  exchangesComplex: 0,
  followWeeks: 2,
}

type R = Omit<TemplateRow, 'key' | 'note'> & { note?: string }
const row = (
  block: number,
  deliverable: string,
  activity: string,
  activityType: ActivityType,
  level: Level,
  hat: HatName,
  hours: number,
  unit: UnitKey | null,
  segment: TemplateRow['segment'],
  note = '',
): R => ({ block, deliverable, activity, activityType, level, hat, hours, unit, fixed: unit === null, segment, note })

/** «Horas de gestión» no es un tipo: usa la lista de Documento o capacitación con nivel propio. */
const GESTION: [ActivityType, Level] = ['document', 'own']

const STANDARD_ROWS: R[] = [
  // 1. Gestión del proyecto (87 h en el mediano)
  row(1, 'Acta de inicio (D02)', 'Redactar el acta de inicio y recabar firmas', 'document', 'medium', 'project_lead', 4, null, 'p3'),
  row(1, 'Mapa de interesados y solicitud de accesos', 'Elaborar el mapa de interesados y la solicitud de accesos', 'document', 'medium', 'project_lead', 4, null, 'p3'),
  row(1, 'Junta de arranque', 'Preparar y llevar la junta de arranque', ...GESTION, 'project_lead', 2, null, 'p3'),
  row(1, 'Facturas y cobros', 'Papeleo del cliente: alta de proveedor', 'document', 'own', 'administration', 3, null, 'p3'),
  row(1, 'Facturas y cobros', 'Factura y seguimiento de cobro', 'document', 'own', 'administration', 2, 'invoices', 'running', '2 por factura'),
  row(1, 'Reportes semanales (D06)', 'Planear el ciclo, demostración y seguimiento', ...GESTION, 'project_lead', 2, 'weeks', 'running', '2 por semana'),
  row(1, 'Reportes semanales (D06)', 'Actualizar avance e indicadores y enviar el reporte', 'document', 'own', 'project_lead', 1, 'weeks', 'running', '1 por semana'),
  row(1, 'Reportes semanales (D06)', 'Revisión entre socios', ...GESTION, 'project_lead', 1, 'weeks', 'running', '1 por semana'),
  row(1, 'Acta de aceptación del hito (D07)', 'Acta, calificación de satisfacción y lecciones del hito (D14)', 'document', 'simple', 'project_lead', 2, 'milestones', 'build', '2 por hito'),
  row(1, 'Paquete de entrega', 'Reunir accesos, documentación técnica, respaldos y evidencias', 'document', 'medium', 'architecture', 4, null, 'last'),
  row(1, 'Acta de cierre (D08)', 'Acta de cierre y lecciones aprendidas del proyecto (D14)', 'document', 'medium', 'project_lead', 4, null, 'last'),
  // 2. Diagnóstico y diseño de la solución (62 h)
  row(2, 'Diagnóstico', 'Entrevista y recorrido del proceso actual', ...GESTION, 'analysis', 2, 'sites', 'p3', '2 por sitio'),
  row(2, 'Diagnóstico', 'Documento de diagnóstico: proceso, usuarios, datos, sistemas y reglas', 'document', 'complex', 'analysis', 8, null, 'p3'),
  row(2, 'Prueba técnica', 'Probar lo más riesgoso contra el sistema real', 'integration', 'own', 'architecture', 8, 'technicalRisks', 'p3', '8 por riesgo técnico; no se calibra'),
  row(2, 'Diseño de la solución', 'Proceso futuro, datos e integraciones', 'document', 'complex', 'architecture', 8, null, 'p3'),
  row(2, 'Diseño de la solución', 'Prototipo de pantallas clave', 'document', 'own', 'analysis', 1, 'keyScreens', 'p3', '1 por pantalla clave'),
  row(2, 'Plan del proyecto (D03)', 'Integrar el alcance definitivo, el desglose y el cronograma', 'document', 'complex', 'project_lead', 8, null, 'p3'),
  row(2, 'Documentos internos de planeación', 'Presupuesto interno, plan de calidad, riesgos y calendario de comunicación', 'document', 'medium', 'project_lead', 4, null, 'p3'),
  row(2, 'Propuesta definitiva (D01)', 'Actualizarla y presentarla', 'document', 'simple', 'sales', 2, null, 'p3'),
  row(2, 'Especificación del hito (D04)', 'Redactar y confirmar la especificación con el responsable del cliente', 'document', 'medium', 'analysis', 4, 'milestones', 'build', '4 por hito'),
  // 3. Base técnica (24 h)
  row(3, 'Ambientes', 'Crear desarrollo, pruebas y producción, con datos ficticios', 'release', 'complex', 'architecture', 6, null, 'h1'),
  row(3, 'Usuarios y permisos', 'Perfiles y permisos por usuario en la base de datos', 'database', 'medium', 'architecture', 4, null, 'h1'),
  row(3, 'Usuarios y permisos', 'Acceso y administración de usuarios', 'screen', 'medium', 'construction', 6, null, 'h1'),
  row(3, 'Respaldos', 'Respaldos diarios y primera prueba de recuperación', 'database', 'medium', 'architecture', 4, null, 'h1'),
  row(3, 'Monitoreo', 'Aviso si el sistema se detiene y primeras pruebas automáticas', 'release', 'medium', 'architecture', 4, null, 'h1'),
  // 4. Módulos propios del proyecto (103 h en CE-INV)
  row(4, 'Módulo', 'Pantalla simple', 'screen', 'simple', 'construction', BASE_HOURS.screen.simple, 'screensSimple', 'build'),
  row(4, 'Módulo', 'Pantalla media', 'screen', 'medium', 'construction', BASE_HOURS.screen.medium, 'screensMedium', 'build'),
  row(4, 'Módulo', 'Pantalla compleja', 'screen', 'complex', 'construction', BASE_HOURS.screen.complex, 'screensComplex', 'build'),
  row(4, 'Módulo', 'Regla de negocio: cálculo, validación o aviso automático', 'screen', 'own', 'construction', 2, 'rules', 'build', 'Solo las que afectan a más de una pantalla'),
  row(4, 'Módulo', 'Cambio de base de datos', 'database', 'medium', 'construction', 4, 'dbChanges', 'build', 'Al menos uno por hito'),
  row(4, 'Reportes', 'Reporte simple', 'report', 'simple', 'construction', BASE_HOURS.report.simple, 'reportsSimple', 'build'),
  row(4, 'Reportes', 'Reporte medio', 'report', 'medium', 'construction', BASE_HOURS.report.medium, 'reportsMedium', 'build'),
  row(4, 'Reportes', 'Reporte complejo', 'report', 'complex', 'construction', BASE_HOURS.report.complex, 'reportsComplex', 'build'),
  // 5. Conexiones con otros sistemas (28 h)
  row(5, 'Conexión', 'Acordar datos, formato, frecuencia y accesos con el contacto de sistemas', 'document', 'medium', 'architecture', 4, 'connections', 'build', '4 por conexión'),
  row(5, 'Conexión', 'Intercambio simple, con su registro y su comportamiento si el otro sistema falla', 'integration', 'simple', 'construction', BASE_HOURS.integration.simple, 'exchangesSimple', 'build'),
  row(5, 'Conexión', 'Intercambio medio, con su registro y su comportamiento si el otro sistema falla', 'integration', 'medium', 'construction', BASE_HOURS.integration.medium, 'exchangesMedium', 'build'),
  row(5, 'Conexión', 'Intercambio complejo, con su registro y su comportamiento si el otro sistema falla', 'integration', 'complex', 'construction', BASE_HOURS.integration.complex, 'exchangesComplex', 'build'),
  row(5, 'Conexión', 'Sesión de prueba, del primer paso al último, con el contacto de sistemas', 'integration', 'own', 'construction', 4, 'connections', 'build', '4 por conexión'),
  // 6. Datos: limpieza y carga inicial (17 h)
  row(6, 'Carga inicial', 'Acordar con el cliente la plantilla de carga y las reglas de limpieza', 'document', 'simple', 'analysis', 2, null, 'h1'),
  row(6, 'Carga inicial', 'Limpiar y cargar los catálogos en el ambiente de pruebas', 'data_load', 'medium', 'construction', 6, null, 'h1'),
  row(6, 'Carga inicial', 'Cargar existencias en producción, con conteos y muestra validada', 'data_load', 'simple', 'construction', 3, 'sites', 'build', '3 por sitio'),
  // 7. Pruebas internas y pruebas del cliente (39 h)
  row(7, 'Guion de casos', 'Escribir el guion de casos desde la especificación del hito', 'document', 'medium', 'analysis', 4, 'milestones', 'build', '4 por hito'),
  row(7, 'Prueba interna del hito', 'Publicar en pruebas, recorrer el proceso completo y revisar permisos y accesos', 'document', 'own', 'quality', 4, 'milestones', 'build', '4 por hito'),
  row(7, 'Pruebas del cliente', 'Sesiones con los usuarios que prueban y el guion de casos', ...GESTION, 'analysis', 2, 'milestones', 'build', '2 por hito'),
  row(7, 'Observaciones corregidas', 'Corregir los defectos encontrados en el hito', 'screen', 'own', 'construction', 3, 'milestones', 'build', 'Horas planeadas para corregir; lo que pase sale de la reserva'),
  // 8. Capacitación, manuales y salida a producción (40 h)
  row(8, 'Manuales', 'Manual del usuario y guía rápida', 'document', 'complex', 'analysis', 8, null, 'last'),
  row(8, 'Manuales', 'Manual técnico y de operación', 'document', 'medium', 'architecture', 4, null, 'last'),
  row(8, 'Capacitación', 'Sesión de capacitación por grupo, con constancia de asistencia', 'document', 'medium', 'analysis', 4, 'groups', 'build', '4 por grupo'),
  row(8, 'Salida a producción', 'Liberar con lista de verificación y respaldo previo', 'release', 'medium', 'construction', 4, 'milestones', 'build', '4 por hito'),
  // 9. Acompañamiento después de la salida (20 h)
  row(9, 'Acompañamiento', 'Presencia el primer día de uso en cada sitio', ...GESTION, 'analysis', 2, 'sites', 'last', '2 por sitio'),
  row(9, 'Acompañamiento', 'Atender dudas y corregir defectos', 'screen', 'own', 'construction', 6, 'followWeeks', 'last', 'Horas planeadas para corregir'),
  row(9, 'Pase a servicio', 'Alta en soporte y calendario de rutinas', 'document', 'simple', 'support', 2, null, 'last'),
]

/** Renglones que fijan las horas planeadas para corregir (Desglose AL). */
export const CORRECTION_ACTIVITIES = new Set(['Corregir los defectos encontrados en el hito', 'Atender dudas y corregir defectos'])

export const STANDARD_TEMPLATE: WbsTemplate = {
  id: 'estandar-v1',
  name: 'Desglose estándar v1',
  projectClass: 'Sistema a la medida, base web estándar',
  description:
    'Los nueve bloques del manual. Proyecto mediano de referencia: CE-INV, 13 semanas, tres hitos, tres sitios y una conexión (420 horas).',
  rows: STANDARD_ROWS.map((r, i) => ({ ...r, key: `std-${i + 1}`, note: r.note ?? '' })),
  builtIn: true,
  createdOn: '2026-11-12',
}

export const BASE_HOURS_V1 = BASE_HOURS satisfies BaseHoursTable

/** Horas por unidad de un renglón con la tabla de horas base vigente (si no es «propia»). */
export function rowUnitHours(r: TemplateRow, base: BaseHoursTable): number {
  if (r.level === 'own' || r.unit === null) return r.hours
  const fromBase = base[r.activityType]?.[r.level]
  return typeof fromBase === 'number' ? fromBase : r.hours
}

export interface EstimateLine {
  row: TemplateRow
  units: number
  unitHours: number
  hours: number
}

export interface Estimate {
  lines: EstimateLine[]
  byBlock: { block: number; hours: number }[]
  fixedHours: number
  activityHours: number
  reserveHours: number
  poolHours: number
  budgetedHours: number
  hoursCost: number
  totalCost: number
  /** Costo total ÷ (1 − margen), redondeado hacia arriba al millar */
  suggestedPrice: number
  price: number
  margin: number
  marginPct: number | null
  /** Tarifa de cambios de alcance: precio ÷ horas de actividades */
  changeRate: number | null
}

export interface EstimateInput {
  template: WbsTemplate
  units: EstimateUnits
  size: ProjectSize
  base: BaseHoursTable
  hourlyCost: number
  reservePct: number
  poolPct: number
  directCosts: number
  targetMargin: number
  rowOverrides?: Record<string, number>
  /** Precio fijado a mano (si no, el sugerido) */
  price?: number | null
}

export function estimate(input: EstimateInput): Estimate {
  const factor = PROJECT_SIZE[input.size].factor
  const lines: EstimateLine[] = input.template.rows.map((r) => {
    const override = input.rowOverrides?.[r.key]
    const units = r.unit ? (input.units[r.unit] ?? 0) : 1
    const unitHours = rowUnitHours(r, input.base)
    const raw = r.fixed ? unitHours * factor : unitHours * units
    const hours = override ?? roundExcel(raw, 1)
    return { row: r, units, unitHours, hours }
  })
  const activityHours = roundExcel(lines.reduce((s, l) => s + l.hours, 0), 1)
  const fixedHours = roundExcel(lines.filter((l) => l.row.fixed).reduce((s, l) => s + l.hours, 0), 1)
  const reserveHours = roundExcel(activityHours * input.reservePct, 0)
  const poolHours = roundExcel(activityHours * input.poolPct, 0)
  const budgetedHours = activityHours + reserveHours + poolHours
  const hoursCost = budgetedHours * input.hourlyCost
  const totalCost = hoursCost + input.directCosts
  const suggestedPrice = input.targetMargin < 1 ? Math.ceil(totalCost / (1 - input.targetMargin) / 1000) * 1000 : 0
  const price = input.price ?? suggestedPrice
  const margin = price - totalCost
  const blocks = [...new Set(lines.map((l) => l.row.block))].sort((a, b) => a - b)
  return {
    lines,
    byBlock: blocks.map((block) => ({
      block,
      hours: roundExcel(lines.filter((l) => l.row.block === block).reduce((s, l) => s + l.hours, 0), 1),
    })),
    fixedHours,
    activityHours,
    reserveHours,
    poolHours,
    budgetedHours,
    hoursCost,
    totalCost,
    suggestedPrice,
    price,
    margin,
    marginPct: price ? margin / price : null,
    changeRate: activityHours ? price / activityHours : null,
  }
}

/** Horas de actividades por tramo, para repartir pagos (Hasta la puerta 3, hitos y cierre). */
export function hoursBySegment(est: Estimate, milestones: number): number[] {
  const n = Math.max(1, milestones)
  const out = new Array(n + 2).fill(0) as number[]
  for (const l of est.lines) {
    switch (l.row.segment) {
      case 'p3':
        out[0] += l.hours
        break
      case 'h1':
        out[1] += l.hours
        break
      case 'last':
        out[n + 1] += l.hours
        break
      case 'build':
        for (let i = 1; i <= n; i++) out[i] += l.hours / n
        break
      case 'running': {
        // Semanas y facturas: se reparten igual entre todos los tramos.
        for (let i = 0; i < n + 2; i++) out[i] += l.hours / (n + 2)
        break
      }
    }
  }
  return out.map((h) => roundExcel(h, 1))
}

/**
 * Pagos sugeridos: el pago inicial cubre al menos el costo de las horas hasta la puerta 3, y
 * el cobro acumulado al aceptarse cada hito cubre el costo acumulado. Se redondea al millar.
 */
export function suggestPayments(est: Estimate, milestones: number, hourlyCost: number): ProposalPayment[] {
  const n = Math.max(1, milestones)
  const seg = hoursBySegment(est, n)
  const initial = Math.min(est.price, Math.ceil((seg[0] * hourlyCost) / 1000) * 1000)
  const rest = est.price - initial
  const buildHours = seg.slice(1, n + 1).reduce((s, h, i) => s + h + (i === n - 1 ? seg[n + 1] : 0), 0)
  const payments: ProposalPayment[] = [{ label: 'Pago inicial', trigger: 'Al firmar el acta de inicio', amount: initial }]
  let assigned = 0
  for (let i = 1; i <= n; i++) {
    const h = seg[i] + (i === n ? seg[n + 1] : 0)
    const amount = i === n ? rest - assigned : Math.round((rest * (h / (buildHours || 1))) / 1000) * 1000
    assigned += amount
    payments.push({ label: `Hito ${i}`, trigger: `Al aceptar el Hito ${i}`, amount })
  }
  return payments
}

/** El tamaño que sugieren las unidades (si apuntan a tamaños distintos, el mayor). */
export function suggestSize(u: EstimateUnits): ProjectSize {
  const screens = u.screensSimple + u.screensMedium + u.screensComplex
  const order: ProjectSize[] = ['small', 'medium', 'large']
  const bySites: ProjectSize = u.sites <= 1 ? 'small' : u.sites <= 3 ? 'medium' : 'large'
  const byMilestones: ProjectSize = u.milestones <= 2 ? 'small' : u.milestones === 3 ? 'medium' : 'large'
  const byScreens: ProjectSize = screens <= 8 ? 'small' : screens <= 20 ? 'medium' : 'large'
  const byConnections: ProjectSize = u.connections === 0 ? 'small' : u.connections <= 2 ? 'medium' : 'large'
  return [bySites, byMilestones, byScreens, byConnections].reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a), 'small')
}
