/**
 * Lo que los formatos D17 (junta de arranque) y D18 (diagnóstico) traen ya llenado con los
 * datos del proyecto: se captura una vez y el formato lo repite.
 */
import { CLIENT_ROLE } from '../domain/catalogs'
import { lines } from '../domain/crm'
import { todayInMexico } from '../domain/dates'
import { fmtDate } from '../domain/format'
import type { FormatCode, ProjectData } from '../domain/types'

const bullet = (xs: string[]) => xs.filter(Boolean).map((x) => `- ${x}`).join('\n')

export function formatAutofill(code: FormatCode, d: ProjectData): Record<string, string> {
  const p = d.project
  const params = p.params
  if (code === 'D17') {
    const facts = p.facts ?? { fields: {}, lists: {} }
    const results = (facts.lists.resultados ?? []).map((r) => [r['resultado.nombre'], r['resultado.comprobacion']].filter(Boolean).join(': '))
    const segs = [...d.segments].sort((a, b) => a.position - b.position)
    const plan = segs.map((s) => {
      const m = d.milestones.find((x) => x.segmentId === s.id)
      const when = m?.plannedDelivery ? `entrega prevista ${fmtDate(m.plannedDelivery)}` : ''
      return [m ? `${s.name}${m.title ? ` · ${m.title}` : ''}` : s.title || s.name, when].filter(Boolean).join(': ')
    })
    const hats = d.hats
      .filter((h) => h.holderId)
      .map((h) => `${h.hat}: ${d.members.find((m) => m.id === h.holderId)?.name ?? ''}`)
    return {
      fecha: todayInMexico(),
      asistentes: bullet([
        ...d.contacts.map((c) => `${c.name}${c.roleKey ? ` · ${CLIENT_ROLE[c.roleKey]}` : c.role ? ` · ${c.role}` : ''}`),
        ...d.members.map((m) => `${m.name} · del despacho`),
      ]),
      objetivo: [facts.fields['proyecto.objetivo'] ?? '', results.length ? `Resultados que se podrán comprobar:\n${bullet(results)}` : ''].filter(Boolean).join('\n\n'),
      plan: bullet([...plan, 'Junta de firma del plan del proyecto (puerta 3) al terminar la planeación.']),
      roles: [
        'Por el cliente:',
        bullet(d.contacts.map((c) => `${c.roleKey ? CLIENT_ROLE[c.roleKey] : c.role}: ${c.name}${c.email ? ` (${c.email})` : ''}`)),
        hats.length ? `Por el despacho:\n${bullet(hats)}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      cambios: bullet([
        'Toda petición se registra en la bitácora de cambios y se clasifica.',
        'Un defecto se corrige sin costo.',
        `Un ajuste menor (menos de 2 horas) se hace con la bolsa de ajustes (${Math.round((params.poolPct ?? 0.08) * 100)} % de las horas).`,
        'Un cambio de alcance lleva una solicitud de cambio con su costo y su fecha, y no se trabaja sin la aprobación por escrito de quien decide y paga.',
      ]),
      aceptacion: bullet([
        'Al entregar cada hito avisamos por correo, con el guion de casos y el acceso.',
        `Tienen ${params.clientReviewDays ?? 7} días hábiles para probar y mandar una sola lista de observaciones.`,
        `Después de corregir, ${params.fixVerifyDays ?? 3} días hábiles para verificar lo corregido.`,
        'Si el plazo vence sin observaciones por escrito, el hito se da por aceptado y se factura.',
        `Garantía de ${params.warrantyDays ?? 60} días naturales sobre defectos de cada hito aceptado.`,
      ]),
      juntas: bullet([
        'Reporte semanal de avance: cada viernes antes de las 14:00, por correo.',
        'Demostración del avance: una vez por semana (día y hora por acordar).',
        'Revisión con el responsable del cliente: cada semana, 30 minutos.',
        'Junta de firma del plan del proyecto: al terminar la planeación.',
      ]),
      pendientes: bullet(
        d.pendings.map((x) => [x.description, d.contacts.find((c) => c.id === x.contactId)?.name ?? '', x.dueOn ? `para el ${fmtDate(x.dueOn)}` : ''].filter(Boolean).join(' · ')),
      ),
      siguientes: bullet(['Diagnóstico: entrevistas con los usuarios.', 'Prueba técnica de lo más riesgoso.', 'Diseño de la solución y prototipo de pantallas clave.', 'Junta de firma del plan del proyecto.']),
    }
  }
  // D18: lo que ya se dijo en la junta de descubrimiento.
  const disc = [...d.documents].filter((x) => x.code === 'D15').sort((a, b) => b.version - a.version)[0]
  const a = { ...(disc?.overrides.fields ?? {}), ...(disc?.snapshot?.fields ?? {}) }
  const join = (...xs: (string | undefined)[]) => xs.filter((x) => x && x.trim()).join('\n')
  return {
    proceso: join(a.proceso, a.herramientas && `Herramientas: ${a.herramientas}`, a.volumen && `Volumen: ${a.volumen}`),
    usuarios: join(a.quienes, a.areas),
    datos: join(a.datos),
    sistemas: join(a.sistemas, a.admin && `Administración y accesos: ${a.admin}`),
    hallazgos: join(...lines(a.problema).map((l) => `- ${l}`), a.costo && `- Costo hoy: ${a.costo}`),
    riesgo: join(a.restricciones),
  }
}
