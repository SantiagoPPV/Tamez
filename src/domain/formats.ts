/**
 * Formatos base y guías de venta (Excel de consultoría, columna «Pendientes»):
 * en cada paso el sistema trae el formato y las preguntas base, en lugar de redactar
 * documentos y subirlos. El despacho puede editarlos en Despacho; si no, se usan estos.
 */
import type { FirmSettings, FormatCode, FormatDef, GuideKey } from './types'

export const DEFAULT_FORMATS: Record<FormatCode, FormatDef> = {
  D15: {
    code: 'D15',
    title: 'Resumen de la junta de descubrimiento',
    intro: 'Lo que entendimos de su operación y del problema, con sus palabras. Por favor corríjanos lo que no sea exacto en los próximos 2 días hábiles.',
    client: true,
    sections: [
      {
        id: 'empresa',
        title: 'La empresa',
        questions: [
          { id: 'giro', label: '¿A qué se dedica la empresa y cómo está organizada?', kind: 'long', auto: 'giro' },
          { id: 'areas', label: '¿Qué áreas y cuántas personas participan en el proceso?', kind: 'long' },
        ],
      },
      {
        id: 'problema',
        title: 'El problema',
        questions: [
          { id: 'problema', label: '¿Qué problema quieren resolver, en sus palabras?', kind: 'long', auto: 'problema', required: true },
          { id: 'desde', label: '¿Desde cuándo pasa y qué lo provoca?', kind: 'long' },
          { id: 'costo', label: '¿Cuánto les cuesta hoy en tiempo, dinero o errores?', kind: 'long' },
          { id: 'si_no', label: '¿Qué pasa si no se resuelve?', kind: 'long' },
        ],
      },
      {
        id: 'hoy',
        title: 'Cómo lo hacen hoy',
        questions: [
          { id: 'proceso', label: '¿Cómo es el proceso hoy, paso a paso?', kind: 'long' },
          { id: 'herramientas', label: '¿Con qué herramientas (hojas de cálculo, sistema, papel)?', kind: 'long' },
          { id: 'volumen', label: '¿Qué volumen manejan (operaciones al día o al mes)?', kind: 'text' },
        ],
      },
      {
        id: 'resultado',
        title: 'Resultado esperado',
        questions: [
          { id: 'exito', label: '¿Cómo se ve el éxito? ¿Qué podrán comprobar al final?', kind: 'long' },
          { id: 'indicador', label: '¿Qué indicador debe mejorar y cuánto?', kind: 'text' },
        ],
      },
      {
        id: 'usuarios',
        title: 'Usuarios',
        questions: [{ id: 'quienes', label: '¿Quiénes lo usarían, cuántos y desde dónde (oficina, almacén, celular)?', kind: 'long' }],
      },
      {
        id: 'sistemas',
        title: 'Sistemas y datos',
        questions: [
          { id: 'sistemas', label: '¿Qué sistemas usan hoy y a cuáles habría que conectarse?', kind: 'long' },
          { id: 'admin', label: '¿Quién administra esos sistemas y cómo se obtienen los accesos?', kind: 'long' },
          { id: 'datos', label: '¿Dónde viven hoy los datos y en qué estado están?', kind: 'long' },
        ],
      },
      {
        id: 'decision',
        title: 'Decisión y compra',
        questions: [
          { id: 'decide', label: '¿Quién decide y quién paga? ¿Quién más participa?', kind: 'long', auto: 'decide', required: true },
          { id: 'presupuesto', label: '¿Hay presupuesto o un rango?', kind: 'text', auto: 'presupuesto' },
          { id: 'fecha', label: '¿Para cuándo lo necesitan y por qué esa fecha?', kind: 'text' },
          { id: 'compra', label: '¿Cómo compran (alta de proveedor, orden de compra, contrato)?', kind: 'long' },
        ],
      },
      {
        id: 'riesgos',
        title: 'Restricciones y riesgos',
        questions: [{ id: 'restricciones', label: '¿Hay fechas obligatorias, reglas, confidencialidad o dependencias de terceros?', kind: 'long' }],
      },
      {
        id: 'siguientes',
        title: 'Siguientes pasos',
        questions: [{ id: 'acuerdos', label: '¿Qué acordamos y para cuándo?', kind: 'long' }],
      },
    ],
  },
  D16: {
    code: 'D16',
    title: 'Análisis de factibilidad',
    intro: 'Revisión interna: si podemos hacerlo, si nos conviene y si es rentable. El problema no importa: todo se puede solucionar.',
    client: false,
    sections: [
      {
        id: 'tecnica',
        title: '¿Podemos hacerlo?',
        questions: [{ id: 'podemos', label: '¿Tenemos la capacidad técnica y de equipo? Lo nuevo, ¿se resuelve con una prueba técnica?', kind: 'yesno', required: true }],
      },
      {
        id: 'conveniencia',
        title: '¿Nos conviene?',
        questions: [{ id: 'conviene', label: '¿Encaja con lo que hacemos, con un cliente con quien queremos trabajar y con un riesgo aceptable?', kind: 'yesno', required: true }],
      },
      {
        id: 'rentabilidad',
        title: '¿Es rentable?',
        questions: [
          { id: 'rentable', label: '¿El margen de la estimación v0 cumple el margen mínimo del despacho?', kind: 'yesno', required: true },
          { id: 'minimo', label: '¿Deja al menos el mínimo de venta por mes de creación?', kind: 'yesno', auto: 'minimo', required: true },
        ],
      },
      {
        id: 'condiciones',
        title: 'Condiciones del cliente',
        questions: [
          { id: 'decide', label: '¿Está identificado quién decide y hay presupuesto o rango?', kind: 'yesno' },
          { id: 'accesos', label: '¿Puede dar a tiempo accesos, información y usuarios para pruebas?', kind: 'yesno' },
          { id: 'carga', label: '¿La fecha que necesita cabe en nuestra carga de trabajo?', kind: 'yesno' },
          { id: 'terceros', label: '¿Lo que depende de terceros (proveedores, otros sistemas) es manejable?', kind: 'yesno' },
        ],
      },
    ],
  },
  D17: {
    code: 'D17',
    title: 'Minuta de la junta de arranque',
    intro: 'Plan, reglas de cambios y de aceptación, y calendario de juntas, tal como quedaron acordados en la junta.',
    client: true,
    sections: [
      {
        id: 'datos',
        title: 'Datos de la junta',
        questions: [
          { id: 'fecha', label: 'Fecha', kind: 'date' },
          { id: 'lugar', label: 'Lugar o liga', kind: 'text' },
          { id: 'asistentes', label: 'Asistentes', kind: 'long', auto: 'asistentes' },
        ],
      },
      { id: 'objetivo', title: 'Objetivo y resultado', questions: [{ id: 'objetivo', label: 'Objetivo del proyecto y lo que se podrá comprobar al final', kind: 'long', auto: 'objetivo' }] },
      { id: 'plan', title: 'Plan', questions: [{ id: 'plan', label: 'Etapas, hitos y fechas clave', kind: 'long', auto: 'plan' }] },
      { id: 'roles', title: 'Responsables', questions: [{ id: 'roles', label: 'Quién es quién en las dos partes', kind: 'long', auto: 'roles' }] },
      { id: 'cambios', title: 'Reglas de cambios', questions: [{ id: 'cambios', label: 'Cómo se pide, se clasifica y se aprueba un cambio', kind: 'long', auto: 'reglas_cambios' }] },
      { id: 'aceptacion', title: 'Reglas de aceptación', questions: [{ id: 'aceptacion', label: 'Cómo se prueba y se acepta cada hito', kind: 'long', auto: 'reglas_aceptacion' }] },
      { id: 'juntas', title: 'Calendario de juntas', questions: [{ id: 'juntas', label: 'Juntas, reportes y demostraciones', kind: 'long', auto: 'juntas' }] },
      { id: 'pendientes', title: 'Lo que necesitamos de ustedes', questions: [{ id: 'pendientes', label: 'Accesos e información, con su fecha compromiso', kind: 'long', auto: 'pendientes' }] },
      { id: 'acuerdos', title: 'Acuerdos y cambios de la junta', questions: [{ id: 'acuerdos', label: 'Lo que se acordó o cambió en la junta', kind: 'long' }] },
      { id: 'siguientes', title: 'Siguientes pasos', questions: [{ id: 'siguientes', label: 'Qué sigue, quién y para cuándo', kind: 'long', auto: 'siguientes_arranque' }] },
    ],
  },
  D18: {
    code: 'D18',
    title: 'Diagnóstico',
    intro: 'Cómo funciona hoy el proceso, con quién y con qué, y lo que hay que cuidar antes de diseñar la solución.',
    client: true,
    sections: [
      { id: 'proceso', title: 'Proceso actual', questions: [{ id: 'proceso', label: 'Paso a paso, con quién y con qué herramienta', kind: 'long', auto: 'proceso', required: true }] },
      { id: 'usuarios', title: 'Usuarios', questions: [{ id: 'usuarios', label: 'Perfiles, cuántos, dónde trabajan y qué tanto usan la computadora o el celular', kind: 'long', auto: 'usuarios' }] },
      { id: 'datos', title: 'Datos', questions: [{ id: 'datos', label: 'Qué datos se manejan, cuántos, dónde viven y en qué estado están', kind: 'long', auto: 'datos' }] },
      { id: 'sistemas', title: 'Sistemas e integraciones', questions: [{ id: 'sistemas', label: 'Sistemas actuales, a qué hay que conectarse, quién los administra y cómo se accede', kind: 'long', auto: 'sistemas' }] },
      { id: 'reglas', title: 'Reglas del área de sistemas', questions: [{ id: 'reglas', label: 'Seguridad, accesos, ambientes, horarios y aprobaciones', kind: 'long' }] },
      { id: 'hallazgos', title: 'Problemas y oportunidades', questions: [{ id: 'hallazgos', label: 'Lo que encontramos y dónde está la mejora', kind: 'long' }] },
      { id: 'riesgo', title: 'Lo más riesgoso', questions: [{ id: 'riesgo', label: 'Qué se probará antes de prometer fechas (prueba técnica)', kind: 'long' }] },
      {
        id: 'confirmacion',
        title: 'Confirmación del cliente',
        questions: [{ id: 'confirmado', label: 'Fecha en que el responsable del cliente confirmó por escrito el proceso actual', kind: 'date', required: true }],
      },
    ],
  },
}

export const GUIDE_TITLE: Record<GuideKey, string> = {
  prospeccion: 'Guía de prospección',
  descubrimiento: 'Guía de la junta de descubrimiento',
  factibilidad: 'Guía del análisis de factibilidad',
  presentacion: 'Guía de presentación de la propuesta',
  cierre: 'Guía de cierre de venta',
  cita_cierre: 'Guía de la cita de cierre',
  arranque: 'Guía de la junta de arranque',
  diagnostico: 'Guía del diagnóstico',
}

export const DEFAULT_GUIDES: Record<GuideKey, string> = {
  prospeccion: `## A quién buscamos
- Empresas medianas con un proceso que hoy vive en hojas de cálculo, papel o sistemas que no se hablan.
- Alguien con autoridad para decidir, o con acceso directo a quien decide.
## Dónde
- Clientes actuales y su red (referencias), cámaras y asociaciones de la industria, eventos y LinkedIn.
- Cada prospecto se da de alta el mismo día, con su origen.
## Primera plática (15 minutos)
- Qué hacen, qué les duele, quién decide, para cuándo y si hay presupuesto o rango.
- Termina siempre con la junta de descubrimiento agendada.
## Alta en el CRM
- Empresa, contacto, empleados de la empresa, empleados que usarían el sistema y la fecha de la junta.`,
  descubrimiento: `## Antes
- Agenda 60 minutos con quien vive el problema y, si se puede, con quien decide.
- Pide permiso para grabar el audio: «para no perder detalle y mandarles un resumen».
## Durante
- Escucha más de lo que hablas: sigue las preguntas base, sin vender todavía.
- Anota el problema con sus palabras y pide números: tiempo, errores, dinero.
- Confirma quién decide, quién paga, presupuesto, fecha y cómo compran.
## Después
- Pega la transcripción y genera el resumen; revísalo y ajústalo.
- Envía el resumen ese mismo día y pide que lo corrijan en 2 días hábiles.`,
  factibilidad: `- El problema no importa: todo se puede solucionar. Se decide por capacidad, conveniencia y rentabilidad.
- Haz la estimación v0 de abajo hacia arriba con el desglose estándar.
- El proyecto debe dejar al menos el mínimo de venta por mes de creación (precio ÷ meses del proyecto). Un proyecto corto está bien si respeta el monto mensual.
- Si no conviene, márcalo como no factible y escribe el porqué: así medimos dónde se caen los prospectos.`,
  presentacion: `## Validación
- Ninguna propuesta sale sin la validación de dirección general.
## Presentación
- Presencial siempre que se pueda. Si el cliente insiste, se manda por correo y se da seguimiento por WhatsApp.
- Recorre el problema con sus palabras, cómo lo logramos, el resultado que podrán comprobar, el plan por hitos, los pagos y lo que necesitamos de ellos.
- Deja claro que monto y fechas se confirman en la propuesta definitiva, después del diagnóstico.
## Segunda entrevista
- Si quien decide no estuvo, agenda una segunda entrevista para presentarle el proyecto.`,
  cierre: `- Da seguimiento hasta tener un sí o un no concreto: «lo vemos» no es respuesta.
- Registra cada seguimiento con fecha, canal y la siguiente fecha.
- Objeciones comunes: precio (muestra el desglose y los pagos por hito), tiempo (entregas tempranas por hito), riesgo (precio fijo, aceptación por hito y garantía).
- Con el sí: pide la aceptación por escrito y que nombren a su responsable del proyecto (puerta 1).
- Con el no: regístralo como perdido, con su motivo.`,
  cita_cierre: `## Agenda (45 a 60 minutos)
- Revisar juntos el acta de inicio y anotar los ajustes (versión 2).
- Recabar a los involucrados: quién decide y paga, responsable, sistemas, compras y pagos, usuarios que prueban.
- Pedir accesos e información con fecha compromiso; primero lo de la prueba técnica.
- Papeleo del cliente: confidencialidad, alta de proveedor y orden de compra, o constancia de que no aplica.
- Datos para facturar y requisitos de pago.
- Pactar que el arranque comienza al recibir el pago inicial.
## Después
- Sube los documentos de la cita, firma el acta y emite la factura del pago inicial.`,
  arranque: `- Prepara la versión 1 de la minuta: plan, reglas de cambios y de aceptación, y calendario de juntas.
- En la junta, haz los cambios ahí mismo. Al terminar, guarda la versión 2 y envíala a los involucrados.
- Con la minuta enviada, pide la puerta 2 para empezar el diagnóstico.`,
  diagnostico: `- Entrevista a los usuarios y documenta el proceso actual, los datos, los sistemas y las reglas del área de sistemas.
- Haz la prueba técnica de lo más riesgoso antes de prometer fechas.
- Pide al responsable del cliente que confirme por escrito el proceso actual.`,
}

export function getFormat(firm: Pick<FirmSettings, 'formats'> | null | undefined, code: FormatCode): FormatDef {
  return firm?.formats?.[code] ?? DEFAULT_FORMATS[code]
}

export function getGuide(firm: Pick<FirmSettings, 'guides'> | null | undefined, key: GuideKey): string {
  return firm?.guides?.[key] ?? DEFAULT_GUIDES[key]
}

/** Todas las preguntas de un formato, en orden. */
export function formatQuestions(def: FormatDef) {
  return def.sections.flatMap((s) => s.questions.map((q) => ({ ...q, section: s.id, sectionTitle: s.title })))
}
