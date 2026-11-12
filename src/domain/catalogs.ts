import type {
  ActivityStatus,
  ActivityType,
  Billing,
  Channel,
  DependsOn,
  DeviationCause,
  HatLevel,
  HatName,
  HourClass,
  HourMark,
  InvoiceConcept,
  Level,
  Light,
  RequestKind,
  RequestStatus,
  RiskClass,
  RiskStatus,
  RowClass,
  Severity,
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
