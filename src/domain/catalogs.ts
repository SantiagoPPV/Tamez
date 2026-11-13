import type {
  ActivityStatus,
  ActivityType,
  Answer3,
  Billing,
  BillingSettings,
  Channel,
  ClientRole,
  CriterionClass,
  CriterionResult,
  CrmStep,
  DependsOn,
  DeviationCause,
  DocumentCode,
  FileKind,
  FollowUpChannel,
  FormatCode,
  GateNumber,
  GuideKey,
  HatLevel,
  HatName,
  HourClass,
  HourMark,
  InvoiceConcept,
  Level,
  Light,
  LostCategory,
  ProjectSize,
  ProjectStage,
  ProspectStage,
  RequestKind,
  RequestStatus,
  RiskClass,
  RiskStatus,
  RoutineFrequency,
  RowClass,
  Severity,
  Urgency,
} from './types'

/** Etiquetas en español de cada catálogo, en el orden de la hoja de control. */
export const ROW_CLASS: Record<RowClass, string> = {
  deliverable: 'Entregable',
  activity: 'Actividad',
  subactivity: 'Subactividad',
}

export const BLOCKS: Record<number, string> = {
  1: '1. Gestión del proyecto',
  2: '2. Diagnóstico y diseño de la solución',
  3: '3. Base técnica',
  4: '4. Módulos propios del proyecto',
  5: '5. Conexiones con otros sistemas',
  6: '6. Datos: limpieza y carga inicial',
  7: '7. Pruebas internas y pruebas del cliente',
  8: '8. Capacitación, manuales y salida a producción',
  9: '9. Acompañamiento después de la salida',
}

export const ACTIVITY_TYPE: Record<ActivityType, string> = {
  screen: 'Pantalla o módulo',
  integration: 'Conexión con otro sistema',
  database: 'Base de datos',
  report: 'Reporte o indicador',
  data_load: 'Carga de datos',
  release: 'Liberación a producción',
  document: 'Documento o capacitación',
}

export const LEVEL: Record<Level, string> = {
  simple: 'Simple',
  medium: 'Media',
  complex: 'Compleja',
  own: 'Propia',
}

export const ACTIVITY_STATUS: Record<ActivityStatus, string> = {
  todo: 'Por hacer',
  in_progress: 'En curso',
  in_review: 'En revisión',
  done: 'Terminado',
}

export const HOUR_CLASS: Record<HourClass, string> = {
  planned: 'Planeada',
  correction: 'Corrección',
  minor_adjustment: 'Ajuste menor',
  unplanned: 'Imprevisto',
}

export const HOUR_MARK: Record<HourMark, string> = {
  training: 'Formación',
  warranty: 'Garantía',
}

export const CHANNEL: Record<Channel, string> = {
  meeting: 'Junta',
  email: 'Correo',
  whatsapp: 'WhatsApp',
  portal: 'Portal',
  phone: 'Teléfono de guardia',
}

export const REQUEST_KIND: Record<RequestKind, string> = {
  defect: 'Defecto',
  minor_adjustment: 'Ajuste menor',
  scope_change: 'Cambio de alcance',
}

export const BILLING: Record<Billing, string> = {
  yes: 'Sí',
  pool: 'No, bolsa de ajustes',
  defect: 'No, defecto',
}

export const REQUEST_STATUS: Record<RequestStatus, string> = {
  in_review: 'En revisión',
  waiting_client: 'En espera del cliente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  in_baseline: 'En línea base',
  done: 'Terminada',
}

export const RISK_CLASS: Record<RiskClass, string> = { risk: 'Riesgo', incident: 'Incidente' }
export const SEVERITY: Record<Severity, string> = { high: 'Alta', medium: 'Media', low: 'Baja' }
export const DEPENDS_ON: Record<DependsOn, string> = { us: 'Nosotros', client: 'Cliente' }
export const RISK_STATUS: Record<RiskStatus, string> = {
  open: 'Abierto',
  in_progress: 'En atención',
  closed: 'Cerrado',
}
export const DEVIATION_CAUSE: Record<DeviationCause, string> = { ours: 'Nuestra', client: 'Cliente' }

export const INVOICE_CONCEPT: Record<InvoiceConcept, string> = {
  initial: 'Pago inicial',
  milestone: 'Hito',
  scope_change: 'Cambio de alcance',
  monthly: 'Mensualidad',
}

export const HAT: Record<HatName, string> = {
  sales: 'Venta y cuenta',
  project_lead: 'Líder de proyecto',
  analysis: 'Análisis',
  architecture: 'Arquitectura',
  construction: 'Construcción',
  quality: 'Revisión de calidad',
  administration: 'Administración',
  support: 'Soporte',
}

export const HAT_LEVEL: Record<HatLevel, string> = {
  observes: '1. Observa',
  full_review: '2. Hace con revisión total',
  gate_review: '3. Hace con revisión en las puertas',
  autonomous: '4. Autónomo',
  na: 'No aplica',
}

export const LIGHT: Record<Light, string> = {
  green: 'Verde',
  yellow: 'Amarillo',
  red: 'Rojo',
  none: 'Sin dato',
}

/** Tramos con que nace un proyecto nuevo (Datos de referencia, columna T). */
export const DEFAULT_SEGMENTS = [
  'Hasta la puerta 3',
  'Hito 1',
  'Hito 2',
  'Hito 3',
  'Acompañamiento y cierre',
]

/** Horas base por tipo de actividad y nivel (Desglose estándar, tabla v1). */
export const BASE_HOURS: Record<ActivityType, { simple: number; medium: number; complex: number }> = {
  screen: { simple: 3, medium: 6, complex: 12 },
  integration: { simple: 8, medium: 12, complex: 16 },
  database: { simple: 2, medium: 4, complex: 8 },
  report: { simple: 2, medium: 5, complex: 10 },
  data_load: { simple: 3, medium: 6, complex: 12 },
  release: { simple: 2, medium: 4, complex: 6 },
  document: { simple: 2, medium: 4, complex: 8 },
}

/** Las cinco puertas; cada una la aprueba Santiago. */
export const GATES = [
  'Propuesta aceptada',
  'Arranque autorizado',
  'Línea base firmada',
  'Hito aceptado',
  'Proyecto cerrado',
]

/**
 * Listas de calidad por tipo de actividad (L1 a L7, «Listas de calidad»).
 * (E) = la casilla pide evidencia.
 */
export const QUALITY_LISTS: Record<ActivityType, { code: string; items: string[] }> = {
  screen: {
    code: 'L1',
    items: [
      'Cada criterio de aceptación de D04 que toca la pantalla se probó y pasó.',
      'Se recorrió en celular, a 375 píxeles de ancho, y en computadora, sin cortes ni desplazamiento lateral.',
      'Con un usuario de prueba de cada rol, cada uno ve y hace solo lo que D04 permite. (E)',
      'Un usuario sin permiso no entra aunque escriba la dirección de la pantalla en el navegador.',
      'Un campo obligatorio vacío muestra un mensaje claro y no guarda el registro.',
      'Se provocó un error, como guardar sin conexión, y el aviso salió en español, sin códigos.',
      'Se probó con datos ficticios realistas: el volumen de un mes de operación. (E)',
    ],
  },
  integration: {
    code: 'L2',
    items: [
      'Se probó contra el sistema real del cliente, no contra una simulación. (E)',
      'Los registros de prueba se acordaron por escrito con el contacto de sistemas y se borraron al terminar.',
      'Cada intercambio queda registrado: fecha, hora, qué se envió, qué se recibió y resultado. (E)',
      'Está escrito qué pasa si el otro sistema falla: reintentos y a quién se avisa.',
      'Se simuló esa falla sin tocar el sistema del cliente, y ocurrió lo escrito.',
      'Enviar dos veces el mismo dato no lo duplica del otro lado.',
      'El contacto de sistemas recibió la evidencia; confirmó por escrito o pasaron 3 días hábiles sin objeción.',
    ],
  },
  database: {
    code: 'L3',
    items: [
      'El cambio está guardado como archivo, con fecha y nombre, en el repositorio de código.',
      'El archivo se aplicó sin errores en desarrollo y en el ambiente de pruebas.',
      'Cada tabla nueva tiene permisos por usuario; sin sesión iniciada no se lee nada. (E)',
      'Hay respaldo de producción previo al cambio, con fecha y hora anotadas. (E)',
      'Está escrita la forma de deshacer el cambio.',
      'Lo aplicado en producción coincide con los archivos: nadie cambió la base a mano.',
    ],
  },
  report: {
    code: 'L4',
    items: [
      'Las cifras cuadran contra la fuente en tres fechas o filtros distintos.',
      'La comparación está guardada: cifra del reporte, cifra de la fuente y diferencia. (E)',
      'La fórmula de cada cifra está escrita en palabras del cliente.',
      'Cada filtro se probó con un resultado conocido.',
      'Sin datos, el reporte muestra ceros o un aviso, no un error.',
      'Exporta en el formato pedido, con las mismas cifras que la pantalla.',
    ],
  },
  data_load: {
    code: 'L5',
    items: [
      'El archivo fuente está guardado sin modificar en la carpeta acordada, y no se copió al ambiente de desarrollo.',
      'La carga completa se ensayó en un ambiente acordado para datos reales.',
      'El conteo de la fuente es igual a registros cargados más registros rechazados. (E)',
      'Las sumas de control cuadran antes y después. (E)',
      'Los registros rechazados están listados con su motivo, y el cliente recibió la lista.',
      'El responsable del cliente validó por escrito una muestra de 30 registros.',
      'Hay respaldo previo a la carga y forma escrita de deshacerla completa.',
    ],
  },
  release: {
    code: 'L6',
    items: [
      'Antes: las pruebas automáticas pasaron sobre la misma versión que se probó en el ambiente de pruebas.',
      'Antes: todas las actividades incluidas tienen revisión interna aprobada.',
      'Antes: las pruebas del cliente de lo que se libera están cerradas.',
      'Antes: hay respaldo de producción del mismo día, con fecha y hora anotadas. (E)',
      'Antes: la forma de regresar está escrita y dice a qué versión se regresa.',
      'Antes: aprobó la liberación quien revisa, y no construyó lo liberado.',
      'Después: quien liberó entró con la cuenta de verificación del despacho y abrió las pantallas del guion, sin capturar movimientos.',
      'Después: la nota de versión está en la bitácora de trabajo: qué cambió, quién liberó, cuándo y con qué respaldo. (E)',
    ],
  },
  document: {
    code: 'L7',
    items: [
      'Usa la plantilla estándar y el nombre de archivo con clave, código y versión.',
      'Alguien distinto a quien lo escribió lo leyó completo, y sus observaciones están atendidas.',
      'Las capturas son de la versión vigente y no muestran datos reales ni contraseñas.',
      'Alguien que no construyó siguió el manual paso a paso y logró el resultado.',
      'La capacitación cubrió cada rol con sus propias tareas.',
      'Hay constancia: correo de entrega del documento o lista de asistencia firmada. (E)',
    ],
  },
}

/** Revisión interna: la hace quien revisa, en toda actividad. */
export const INTERNAL_REVIEW = [
  'Quien revisa no construyó la actividad.',
  'La lista del tipo está completa, y la evidencia abre y corresponde.',
  'Quien revisa repitió dos casillas al azar y obtuvo lo mismo.',
  'Los permisos de lo nuevo se probaron con un usuario que no debe tener acceso.',
  'Los archivos cambiados corresponden solo a esta actividad.',
  'Cada defecto encontrado quedó corregido y contado como defecto interno.',
]

export function options<T extends string>(map: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }))
}

/* ---------------------------------------------------------------------------
 * Puertas (Procedimientos y puertas). Las cinco las aprueba Santiago.
 * ------------------------------------------------------------------------- */
export const GATE_DEFS: Record<GateNumber, { name: string; stage: string; items: string[]; ifMissing: string }> = {
  1: {
    name: 'Propuesta aceptada',
    stage: 'Preventa',
    items: [
      'El cliente aceptó la D01 por escrito y la aceptación está guardada.',
      'El cliente nombró por escrito a su responsable del proyecto.',
    ],
    ifMissing:
      'No se pasa a Inicio. Venta y cuenta pide lo faltante al cliente y lo anota en la hoja de control, con fecha compromiso.',
  },
  2: {
    name: 'Arranque autorizado',
    stage: 'Inicio',
    items: [
      'La D02 está firmada por las dos partes y guardada.',
      'El pago inicial se recibió, o el cliente emitió la orden de compra.',
      'El responsable del cliente está nombrado en el acta.',
      'Los accesos y la información se solicitaron por escrito, con fecha compromiso.',
    ],
    ifMissing:
      'No empieza el diagnóstico. El Líder de proyecto avisa por escrito al responsable del cliente qué falta y que el arranque se recorre.',
  },
  3: {
    name: 'Línea base firmada',
    stage: 'Planeación',
    items: [
      'El cliente firmó alcance y fechas definitivos (D03) y aceptó por escrito los montos definitivos (D01).',
      'La versión firmada está guardada como línea base.',
    ],
    ifMissing: 'No se construye nada. El Líder de proyecto avisa al responsable del cliente qué falta y qué fecha se recorre.',
  },
  4: {
    name: 'Hito aceptado',
    stage: 'Ejecución',
    items: ['La D07 está firmada, o el plazo de revisión venció sin observaciones por escrito.'],
    ifMissing:
      'El hito no se factura; el siguiente avanza mientras el cliente revisa. Se pausa si las observaciones siguen abiertas, o una factura sigue vencida, 10 días hábiles después de su plazo.',
  },
  5: {
    name: 'Proyecto cerrado',
    stage: 'Cierre',
    items: [
      'La D08 está firmada por las dos partes.',
      'Todos los pagos están facturados: inicial, hitos y cambios de alcance aprobados.',
      'La D14 del proyecto está registrada, con horas reales por actividad.',
    ],
    ifMissing:
      'El proyecto no se da por cerrado y sigue en el control semanal. El Líder de proyecto anota qué falta y quién lo resuelve, y avisa a Santiago.',
  },
}

export const CRITERION_RESULT: Record<CriterionResult, string> = { pass: 'Cumple', fail: 'No cumple' }
export const CRITERION_CLASS: Record<CriterionClass, string> = {
  none: 'Sin observación',
  defect: 'Defecto',
  minor_adjustment: 'Ajuste menor',
  scope_change: 'Cambio de alcance',
}

export const CLIENT_ROLE: Record<ClientRole, string> = {
  decides: 'Decide y paga',
  responsible: 'Responsable del proyecto',
  systems: 'Contacto de sistemas',
  billing: 'Tramita órdenes y pagos',
  tester: 'Usuario que prueba',
  other: 'Otro',
}

/* ---------------------------------------------------------------------------
 * Documentos estándar (Plantillas con el cliente e internas; carpeta modelo)
 * ------------------------------------------------------------------------- */
export type DocContextKind = 'none' | 'milestone' | 'change' | 'week' | 'month' | 'proposal'

export const DOCUMENTS: Record<
  DocumentCode,
  { title: string; folder: string; slug: string; client: boolean; context: DocContextKind; template: string | null; prepares: string; format?: FormatCode }
> = {
  D15: { title: 'Resumen de la junta de descubrimiento', folder: '01-preventa', slug: 'resumen-de-descubrimiento', client: true, context: 'none', template: null, prepares: 'Venta y cuenta', format: 'D15' },
  D16: { title: 'Análisis de factibilidad', folder: '01-preventa', slug: 'analisis-de-factibilidad', client: false, context: 'none', template: null, prepares: 'Arquitectura', format: 'D16' },
  D17: { title: 'Minuta de la junta de arranque', folder: '02-inicio', slug: 'junta-de-arranque', client: true, context: 'none', template: null, prepares: 'Líder de proyecto', format: 'D17' },
  D18: { title: 'Diagnóstico', folder: '03-planeacion', slug: 'diagnostico', client: true, context: 'none', template: null, prepares: 'Análisis', format: 'D18' },
  D01: { title: 'Propuesta preliminar y definitiva', folder: '01-preventa', slug: 'propuesta', client: true, context: 'proposal', template: 'D01-propuesta', prepares: 'Venta y cuenta' },
  D02: { title: 'Acta de inicio', folder: '02-inicio', slug: 'acta-de-inicio', client: true, context: 'none', template: 'D02-acta-de-inicio', prepares: 'Líder de proyecto' },
  D03: { title: 'Plan del proyecto (línea base)', folder: '03-planeacion', slug: 'plan-del-proyecto', client: true, context: 'none', template: 'D03-plan-del-proyecto', prepares: 'Líder de proyecto' },
  D04: { title: 'Especificación del hito', folder: '04-hitos', slug: 'especificacion', client: true, context: 'milestone', template: 'D04-especificacion-del-hito', prepares: 'Análisis' },
  D05: { title: 'Solicitud de cambio', folder: '05-control', slug: 'solicitud-de-cambio', client: true, context: 'change', template: 'D05-solicitud-de-cambio', prepares: 'Líder de proyecto' },
  D06: { title: 'Reporte semanal de avance', folder: '05-control', slug: 'reporte-semanal', client: true, context: 'week', template: 'D06-reporte-semanal', prepares: 'Líder de proyecto' },
  D07: { title: 'Acta de aceptación del hito', folder: '04-hitos', slug: 'acta-de-aceptacion', client: true, context: 'milestone', template: 'D07-acta-de-aceptacion', prepares: 'Líder de proyecto' },
  D08: { title: 'Acta de cierre', folder: '06-cierre', slug: 'acta-de-cierre', client: true, context: 'none', template: 'D08-acta-de-cierre', prepares: 'Líder de proyecto' },
  D09: { title: 'Reporte mensual de servicio', folder: '07-servicio', slug: 'reporte-mensual', client: true, context: 'month', template: 'D09-reporte-mensual', prepares: 'Soporte' },
  D10: { title: 'Ficha de traspaso', folder: '01-preventa', slug: 'ficha-de-traspaso', client: false, context: 'none', template: 'D10-ficha-de-traspaso', prepares: 'Venta y cuenta' },
  D11: { title: 'Presupuesto interno', folder: '05-control', slug: 'presupuesto-interno', client: false, context: 'none', template: null, prepares: 'Líder de proyecto' },
  D12: { title: 'Plan de calidad', folder: '03-planeacion', slug: 'plan-de-calidad', client: false, context: 'none', template: 'D12-plan-de-calidad', prepares: 'Líder de proyecto' },
  D13: { title: 'Bitácora del proyecto', folder: '05-control', slug: 'bitacora-del-proyecto', client: false, context: 'none', template: null, prepares: 'Líder de proyecto' },
  D14: { title: 'Lecciones aprendidas', folder: '06-cierre', slug: 'lecciones-aprendidas', client: false, context: 'milestone', template: 'D14-lecciones-aprendidas', prepares: 'Líder de proyecto' },
}

export const DOCUMENT_STATUS = { draft: 'Borrador', sent: 'Enviado', signed: 'Firmado' } as const

/** Carpeta del proyecto estándar (06-carpeta-modelo). */
export const PROJECT_FOLDERS = [
  '01-preventa',
  '02-inicio',
  '03-planeacion',
  '04-hitos',
  '05-control',
  '06-cierre',
  '07-servicio',
  '08-administracion',
]

/* ---------------------------------------------------------------------------
 * Servicio mensual
 * ------------------------------------------------------------------------- */
export const URGENCY: Record<Urgency, string> = { urgent: 'Urgente', normal: 'Normal' }

export const ROUTINE_FREQUENCY: Record<RoutineFrequency, string> = {
  continuous: 'Continuo',
  daily: 'Diario',
  weekly: 'Cada semana',
  monthly: 'Cada mes',
  bimonthly: 'Cada bimestre',
  quarterly: 'Cada trimestre',
}

/** Rutinas de la mensualidad tipo (valores iniciales). */
export const STANDARD_ROUTINES: { name: string; frequency: RoutineFrequency; reviewer: string; evidenceHint: string }[] = [
  { name: 'Monitoreo con aviso si el sistema se detiene', frequency: 'continuous', reviewer: '', evidenceHint: 'Registro de avisos y de tiempo fuera de servicio' },
  { name: 'Respaldos', frequency: 'daily', reviewer: '', evidenceHint: 'Registro del respaldo de cada día' },
  { name: 'Prueba de recuperación', frequency: 'bimonthly', reviewer: 'Arquitectura', evidenceHint: 'Constancia con fecha, respaldo usado y resultado' },
  { name: 'Actualizaciones de seguridad', frequency: 'monthly', reviewer: 'Revisión de calidad', evidenceHint: 'Nota de versión en la D13' },
  { name: 'Revisión de accesos', frequency: 'monthly', reviewer: 'Responsable del cliente', evidenceHint: 'Lista de usuarios activos confirmada por el cliente' },
  { name: 'Guardia para fallas urgentes', frequency: 'weekly', reviewer: '', evidenceHint: 'Calendario compartido de guardias' },
]

/* ---------------------------------------------------------------------------
 * Preventa y estimación
 * ------------------------------------------------------------------------- */
export const PROSPECT_STAGE: Record<ProspectStage, string> = {
  initial: 'Prospecto inicial',
  feasible: 'Prospecto factible',
  confirmed: 'Prospecto confirmado',
  client: 'Cliente',
  lost: 'Prospecto perdido',
}

/** Etapas del cliente una vez confirmada la venta (las puertas 2 a 5 marcan el paso). */
export const PROJECT_STAGE: Record<ProjectStage, string> = {
  confirmed: 'Por arrancar (falta el pago inicial)',
  start: 'Cliente en Inicio',
  planning: 'Cliente en Planeación',
  execution: 'Cliente en Ejecución',
  closing: 'Cliente en Cierre',
  service: 'Cliente en Servicio',
  closed: 'Proyecto cerrado',
  cancelled: 'Cancelado',
}
export const STAGE_ORDER: ProjectStage[] = ['confirmed', 'start', 'planning', 'execution', 'closing', 'service', 'closed']

export type Phase = 'preventa' | 'venta' | 'produccion'
export const PHASE: Record<Phase, string> = { preventa: 'Preventa', venta: 'Venta', produccion: 'Producción' }

/** Pasos del CRM (Excel de consultoría): proceso, estado, paso y cuándo está listo. */
export const CRM_STEPS: { step: CrmStep; phase: Phase; status: ProspectStage; title: string; done: string; guide: GuideKey }[] = [
  { step: 'alta', phase: 'preventa', status: 'initial', title: 'Alta del prospecto', done: 'Constan la empresa, el contacto, el tamaño de la empresa y del proyecto, y la junta de descubrimiento está programada.', guide: 'prospeccion' },
  { step: 'descubrimiento', phase: 'preventa', status: 'initial', title: 'Junta de descubrimiento', done: 'La junta se tuvo, hay resumen, consta el problema en sus palabras y quién decide.', guide: 'descubrimiento' },
  { step: 'factibilidad', phase: 'preventa', status: 'initial', title: 'Análisis de factibilidad', done: 'Se decidió si podemos, si nos conviene y si es rentable, con la estimación v0 y el mínimo mensual.', guide: 'factibilidad' },
  { step: 'propuesta', phase: 'venta', status: 'feasible', title: 'Propuesta preliminar', done: 'Dirección general validó la propuesta y se presentó al cliente.', guide: 'presentacion' },
  { step: 'segunda', phase: 'venta', status: 'feasible', title: 'Segunda entrevista con quien decide', done: 'Se decidió si hace falta; si sí, ya se tuvo.', guide: 'presentacion' },
  { step: 'seguimiento', phase: 'venta', status: 'feasible', title: 'Seguimiento hasta un sí o un no', done: 'Hay un sí o un no concreto; con el sí, Santiago aprobó la puerta 1.', guide: 'cierre' },
  { step: 'acta', phase: 'venta', status: 'confirmed', title: 'Acta de inicio firmada', done: 'La D02 está firmada por las dos partes y se envió a los involucrados.', guide: 'cita_cierre' },
  { step: 'cierre', phase: 'venta', status: 'confirmed', title: 'Cita de cierre', done: 'Constan los involucrados, los accesos con fecha compromiso, el papeleo del cliente, los datos para facturar y el acuerdo de arrancar al pago.', guide: 'cita_cierre' },
  { step: 'cobro', phase: 'venta', status: 'confirmed', title: 'Factura y cobro del pago inicial', done: 'La factura del pago inicial está cobrada: el prospecto pasa a cliente y nace en Operaciones.', guide: 'cita_cierre' },
]

export const LOST_CATEGORY: Record<LostCategory, string> = {
  not_feasible: 'No pasó la factibilidad',
  no_budget: 'Sin presupuesto',
  competitor: 'Eligió a otro proveedor',
  no_response: 'Dejó de responder',
  postponed: 'Lo pospuso',
  not_decider: 'No llegamos a quien decide',
  other: 'Otro',
}

export const FOLLOW_UP_CHANNEL: Record<FollowUpChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Correo',
  phone: 'Llamada',
  meeting: 'Presencial',
  video: 'Videollamada',
}

export const PRESENTATION: Record<'in_person' | 'email' | 'video', string> = {
  in_person: 'Presencial (lo preferido)',
  video: 'Videollamada',
  email: 'Por correo, con seguimiento por WhatsApp',
}

export const ANSWER3: Record<Answer3, string> = { yes: 'Sí', no: 'No', pending: 'Por confirmar' }

export const PAPERWORK_STATUS: Record<'pending' | 'done' | 'na', string> = { pending: 'Pendiente', done: 'Listo', na: 'No aplica' }

export const FILE_KIND: Record<FileKind, string> = {
  audio: 'Grabación',
  acta: 'Acta firmada',
  nda: 'Confidencialidad',
  vendor: 'Alta de proveedor',
  purchase_order: 'Orden de compra',
  invoice_pdf: 'Factura (PDF)',
  invoice_xml: 'Factura (XML)',
  payment_proof: 'Comprobante de pago',
  closing: 'Documento de la cita de cierre',
  other: 'Otro',
}

/* Catálogos del SAT (CFDI 4.0): los más usados en este negocio. */
export const TAX_SYSTEM: Record<string, string> = {
  '601': '601 General de Ley Personas Morales',
  '603': '603 Personas Morales con Fines no Lucrativos',
  '612': '612 Personas Físicas con Actividades Empresariales y Profesionales',
  '626': '626 Régimen Simplificado de Confianza',
  '621': '621 Incorporación Fiscal',
  '625': '625 Actividades con Plataformas Tecnológicas',
  '606': '606 Arrendamiento',
  '605': '605 Sueldos y Salarios',
  '616': '616 Sin obligaciones fiscales',
}
export const CFDI_USE: Record<string, string> = {
  G03: 'G03 Gastos en general',
  G01: 'G01 Adquisición de mercancías',
  I04: 'I04 Equipo de cómputo y accesorios',
  I08: 'I08 Otra maquinaria y equipo',
  S01: 'S01 Sin efectos fiscales',
}
export const PAYMENT_FORM: Record<string, string> = {
  '03': '03 Transferencia electrónica de fondos',
  '02': '02 Cheque nominativo',
  '01': '01 Efectivo',
  '04': '04 Tarjeta de crédito',
  '28': '28 Tarjeta de débito',
  '99': '99 Por definir',
}
export const PAYMENT_METHOD: Record<'PUE' | 'PPD', string> = {
  PUE: 'PUE Pago en una sola exhibición',
  PPD: 'PPD Pago en parcialidades o diferido',
}
export const CANCEL_MOTIVE: Record<'01' | '02' | '03' | '04', string> = {
  '01': '01 Con errores, con relación (se sustituye)',
  '02': '02 Con errores, sin relación',
  '03': '03 No se llevó a cabo la operación',
  '04': '04 Operación nominativa en una factura global',
}

export const DEFAULT_BILLING: BillingSettings = {
  series: 'A',
  productKey: '81111500',
  unitKey: 'E48',
  unitName: 'Unidad de servicio',
  paymentForm: '03',
  paymentMethod: 'PPD',
  cfdiUse: 'G03',
  taxRate: 0.16,
}

export const PROJECT_SIZE: Record<ProjectSize, { label: string; factor: number; weeks: string; hint: string }> = {
  small: { label: 'Chico', factor: 0.6, weeks: '4 a 8', hint: 'Un sitio o área; 1 o 2 hitos; hasta 8 pantallas; sin conexiones; menos de 200 horas' },
  medium: { label: 'Mediano', factor: 1.0, weeks: '9 a 16', hint: 'Hasta tres sitios; 3 hitos; de 9 a 20 pantallas; una o dos conexiones; de 200 a 500 horas' },
  large: { label: 'Grande', factor: 1.5, weeks: '17 a 26', hint: 'Más de tres sitios; 4 hitos o más; más de 20 pantallas; tres conexiones o más; más de 500 horas' },
}
