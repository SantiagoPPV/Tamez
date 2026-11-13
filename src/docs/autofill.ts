/**
 * Llenado automático de las plantillas: de los datos del proyecto salen los documentos.
 * Orden para cada campo: lo capturado en el documento → lo capturado en el proyecto
 * (facts: se captura una vez) → lo que se calcula aquí → vacío (se marca como faltante).
 */
import { ACTIVITY_TYPE, BASE_HOURS, BLOCKS, CHANNEL, CRITERION_CLASS, DOCUMENTS, LIGHT, QUALITY_LISTS, REQUEST_KIND, REQUEST_STATUS } from '../domain/catalogs'
import { computeControl, type ControlResult } from '../domain/control'
import { contentToDoc } from '../domain/crm'
import { addDays, diffDays, maxDate, todayInMexico, type ISODate } from '../domain/dates'
import { estimate, STANDARD_TEMPLATE } from '../domain/estimating'
import { folio, pad } from '../domain/format'
import { fmtMinutes, monthRange, monthlyService } from '../domain/service'
import type {
  ChangeRequest,
  ClientContact,
  ClientRole,
  DocData,
  FirmSettings,
  Milestone,
  ProjectData,
  ProjectDocument,
  Proposal,
  Prospect,
  Segment,
} from '../domain/types'
import {
  cap,
  dDate,
  dDayMonth,
  dLong,
  dLongCap,
  dLongNoYear,
  dShort,
  dShortDay,
  dShortNoYear,
  hours,
  joinY,
  money,
  moneyWords,
  monthName,
  pct,
  words,
} from './text'

export interface DocEnv {
  data: ProjectData
  firm: FirmSettings
  proposals: Proposal[]
  prospects: Prospect[]
  today?: ISODate
}

type Row = Record<string, string>
const EMPTY: DocData = { fields: {}, lists: {} }

/* --------------------------------------------------------------- archivos */

export function docVariantSuffix(doc: ProjectDocument, data: ProjectData): string {
  const c = doc.context
  switch (doc.code) {
    case 'D01':
      return `-${c.variant ?? 'preliminar'}`
    case 'D04':
    case 'D07':
    case 'D14': {
      const m = data.milestones.find((x) => x.id === c.milestoneId)
      return m ? `-hito-${m.key.replace(/^H/i, '')}` : ''
    }
    case 'D05': {
      const scope = data.changes.filter((x) => x.kind === 'scope_change').sort((a, b) => a.seq - b.seq)
      const i = scope.findIndex((x) => x.id === c.changeId)
      return `-${pad(i >= 0 ? i + 1 : 1, 2)}`
    }
    case 'D06':
      return `-${pad(c.week ?? 1, 2)}`
    case 'D09':
      return `-${c.month ?? ''}`
    default:
      return ''
  }
}

/** CLAVE-código-nombre-versión, p. ej. CE-INV-D02-acta-de-inicio-v1 */
export function fileBase(doc: ProjectDocument, data: ProjectData): string {
  const d = DOCUMENTS[doc.code]
  const slug = doc.code === 'D04' ? 'especificacion' : doc.code === 'D07' ? 'acta-de-aceptacion' : d.slug
  return `${data.project.key}-${doc.code}-${slug}${docVariantSuffix(doc, data)}-v${doc.version}`
}

/** Carpeta donde se guarda (06-carpeta-modelo). */
export function docFolder(doc: ProjectDocument, data: ProjectData): string {
  const d = DOCUMENTS[doc.code]
  if (doc.code === 'D04' || doc.code === 'D07') {
    const m = data.milestones.find((x) => x.id === doc.context.milestoneId)
    return m ? `${d.folder}/hito-${m.key.replace(/^H/i, '')}` : d.folder
  }
  return d.folder
}

/* ---------------------------------------------------------------- apoyos */

function roleOf(c: ClientContact): ClientRole {
  if (c.roleKey) return c.roleKey
  const r = c.role.toLowerCase()
  if (r.startsWith('decide')) return 'decides'
  if (r.startsWith('responsable')) return 'responsible'
  if (r.includes('sistemas')) return 'systems'
  if (r.includes('tramita') || r.includes('pagos')) return 'billing'
  if (r.includes('prueba')) return 'tester'
  return 'other'
}

function people(data: ProjectData) {
  const member = (id: string | null | undefined) => data.members.find((m) => m.id === id) ?? null
  const holder = (hat: string) => member(data.hats.find((h) => h.hat === hat)?.holderId)
  const sales = holder('sales') ?? data.members[0] ?? null
  const lead = holder('project_lead') ?? sales
  const contacto = data.members.find((m) => m.id !== sales?.id) ?? lead
  const client = (role: ClientRole) => data.contacts.find((c) => roleOf(c) === role) ?? null
  return { member, holder, sales, lead, contacto, client }
}

const lower = (s: string | undefined) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '')

function segmentsSorted(data: ProjectData): Segment[] {
  return [...data.segments].sort((a, b) => a.position - b.position)
}

/** Fin planeado del proyecto: la fecha más tardía del desglose o del último hito. */
function projectEnd(data: ProjectData): ISODate | null {
  return maxDate(...data.wbs.map((w) => w.plannedDate), ...data.milestones.map((m) => m.plannedDelivery))
}

function weekOf(data: ProjectData, d: ISODate | null | undefined): number | null {
  if (!d || !data.project.startDate) return null
  return Math.floor(diffDays(data.project.startDate, d) / 7) + 1
}

function milestoneLabel(data: ProjectData, m: Milestone): string {
  return data.segments.find((s) => s.id === m.segmentId)?.name ?? `Hito ${m.key.replace(/^H/i, '')}`
}

function cutoffFor(doc: ProjectDocument, data: ProjectData, today: ISODate): ISODate {
  return doc.context.cutoff ?? (doc.status !== 'draft' ? doc.sentOn : null) ?? data.project.cutoffDate ?? today
}

function scopeFolio(data: ProjectData, c: ChangeRequest): string {
  const scope = data.changes.filter((x) => x.kind === 'scope_change').sort((a, b) => a.seq - b.seq)
  const i = scope.findIndex((x) => x.id === c.id)
  return i >= 0 ? `${data.project.key}-D05-${pad(i + 1, 2)}` : folio.change(c.seq)
}

/* -------------------------------------------------------------- comunes */

function common(doc: ProjectDocument, env: DocEnv, r: ControlResult): Row {
  const { data, firm } = env
  const p = data.project
  const pa = p.params
  const ppl = people(data)
  const decides = ppl.client('decides')
  const responsible = ppl.client('responsible')
  const systems = ppl.client('systems')
  const end = projectEnd(data)
  const weeks = p.startDate && end ? Math.ceil((diffDays(p.startDate, end) + 1) / 7) : null
  const ms = [...data.milestones].sort((a, b) => (a.plannedDelivery ?? '').localeCompare(b.plannedDelivery ?? ''))
  const date = doc.sentOn ?? doc.createdOn
  const base = fileBase(doc, data)
  const payments = 1 + data.milestones.filter((m) => m.paymentAmount).length
  const f: Row = {
    'documento.fecha': dLongCap(date),
    'documento.version': `v${doc.version}`,
    'documento.archivo': base,
    'documento.archivo_pdf': `${base}.pdf`,
    'proyecto.nombre': p.name,
    'proyecto.clave': p.key,
    'proyecto.fecha_arranque': dLong(p.startDate),
    'proyecto.arranque': dLong(p.startDate),
    'proyecto.fecha_inicio': dLong(p.startDate),
    'proyecto.fecha_cierre': dLong(end),
    'proyecto.duracion': weeks ? `${weeks} semanas` : '',
    'proyecto.duracion_semanas': weeks ? String(weeks) : '',
    'proyecto.semanas': weeks ? String(weeks) : '',
    'proyecto.precio_total': money(pa.price),
    'proyecto.numero_pagos': words(payments),
    'proyecto.numero_hitos': String(data.milestones.length),
    'proyecto.numero_hitos_texto': cap(words(data.milestones.length)),
    'proyecto.semanas_hitos': joinY(ms.map((m) => weekOf(data, m.plannedDelivery) ?? '').filter(Boolean)),
    'proyecto.linea_base': p.budgetVersion,
    'proyecto.carpeta_hitos': '04-hitos',
    'cliente.nombre': p.client,
    'cliente.decide.nombre': decides?.name ?? '',
    'cliente.decide.puesto': decides?.position ?? '',
    'cliente.decide.puesto_minusculas': lower(decides?.position),
    'cliente.decide.correo': decides?.email ?? '',
    'cliente.responsable.nombre': responsible?.name ?? '',
    'cliente.responsable.puesto': responsible?.position ?? '',
    'cliente.responsable.correo': responsible?.email ?? '',
    'cliente.responsable.nombre_puesto': responsible ? `${responsible.name}${responsible.position ? `, ${lower(responsible.position)}` : ''}` : '',
    'cliente.suplente.nombre': systems?.name ?? '',
    'despacho.nombre': firm.name,
    'despacho.cuenta.nombre': ppl.sales?.name ?? '',
    'despacho.cuenta.puesto': ppl.sales?.position || 'Socio',
    'despacho.cuenta.correo': ppl.sales?.email || firm.salesEmail,
    'despacho.cuenta.telefono': ppl.sales?.phone || firm.salesPhone,
    'despacho.lider.nombre': ppl.lead?.name ?? '',
    'despacho.lider.puesto': ppl.lead?.position || 'Socio',
    'despacho.contacto.nombre': ppl.contacto?.name ?? '',
    'despacho.contacto.correo': ppl.contacto?.email || firm.contactEmail,
    'despacho.contacto.telefono': ppl.contacto?.phone || firm.contactPhone,
    'soporte.correo': firm.supportEmail,
    'soporte.telefono_guardia': firm.supportPhone,
    'regla.dias_pago': pa.creditDays == null ? '' : String(pa.creditDays),
    'regla.dias_revision': String(pa.clientReviewDays),
    'regla.dias_verificacion': String(pa.fixVerifyDays),
    'regla.dias_garantia': String(pa.warrantyDays),
    'regla.dias_para_pausar': String(pa.pauseAfterOverdueDays),
    'mensualidad.monto': money(pa.monthlyFee),
    'mensualidad.monto_texto': pa.monthlyFee == null ? '' : moneyWords(pa.monthlyFee).replace(' pesos', ''),
    'mensualidad.arranque': dLong(pa.serviceStart),
    'mensualidad.fecha_arranque': dLong(pa.serviceStart),
    'mensualidad.fecha_arranque_corta': dLongNoYear(pa.serviceStart).split(' ').slice(0, 2).join(' '),
    'mensualidad.bolsa_horas': hours(pa.monthlyPoolHours),
    'mensualidad.horas_no_usadas': pa.unusedHoursRule,
    'mensualidad.bolsa_regla_no_usadas': pa.unusedHoursRule,
    'mensualidad.respuesta_urgente_habil': `${pa.urgentResponseHours} ${pa.urgentResponseHours === 1 ? 'hora' : 'horas'}`,
    'mensualidad.respuesta_urgente_inhabil': String(pa.urgentResponseOffHours),
    'mensualidad.respuesta_normal': `${pa.normalResponseDays} ${pa.normalResponseDays === 1 ? 'día hábil' : 'días hábiles'}`,
    'mensualidad.canal': firm.supportEmail ? `el correo ${firm.supportEmail}` : '',
    'mensualidad.duracion_revision': '1 hora',
    'mensualidad.frecuencia_prueba_respaldo': 'cada bimestre',
    'bolsa.horas': hours(r.budget.poolHours),
    'bolsa.horas_totales': hours(r.budget.poolHours),
    'bolsa.horas_usadas': hours(r.figures.poolUsed),
    'bolsa.saldo_horas': hours(r.figures.poolBalance),
    'facturacion.razon_social': p.client,
    'facturacion.dias_pago': pa.creditDays == null ? '' : `Transferencia a ${pa.creditDays} días naturales de recibida la factura.`,
    'facturacion.documento_exigido': pa.paymentDocuments,
    'facturacion.envio': pa.invoiceReception,
    'facturacion.orden_compra': data.invoices.find((i) => i.purchaseOrder)?.purchaseOrder ?? '',
  }
  return f
}

/* -------------------------------------------------------- listas comunes */

function segmentRows(data: ProjectData, includeEnds: boolean): Row[] {
  const segs = segmentsSorted(data)
  return segs
    .map((s, i) => {
      const m = data.milestones.find((x) => x.segmentId === s.id) ?? null
      if (!m && !includeEnds) return null
      const segDates = data.wbs.filter((w) => w.segmentId === s.id).map((w) => w.plannedDate)
      const date = m?.plannedDelivery ?? maxDate(...segDates)
      const firstWeek = weekOf(data, data.wbs.filter((w) => w.segmentId === s.id).map((w) => w.plannedDate).filter(Boolean).sort()[0] ?? null)
      const lastWeek = weekOf(data, date)
      const semana =
        !m && i === segs.length - 1 && firstWeek && lastWeek && firstWeek !== lastWeek ? `Semanas ${firstWeek} y ${lastWeek}` : lastWeek ? `Semana ${lastWeek}` : ''
      return {
        'hito.numero': m ? s.name : '',
        'hito.nombre': m?.title || s.title || s.name,
        'hito.resultado': m?.result || s.result || '',
        'hito.criterio': m?.criterion || s.criterion || '',
        'hito.alcance': m?.result || s.result || '',
        'hito.semana': semana,
        'hito.fecha': dLongCap(date),
      } as Row
    })
    .filter((x): x is Row => x !== null)
}

function paymentRows(data: ProjectData, r: ControlResult): Row[] {
  const pa = data.project.params
  const initialInv = data.invoices.find((i) => i.concept === 'initial')
  const rows: Row[] = []
  const status = (inv: (typeof data.invoices)[number] | undefined) => {
    const c = inv ? r.invoices.get(inv.id) : null
    return c?.status === 'Cobrada' ? 'Pagado' : c?.status && c.status !== 'Por facturar' ? 'Facturado' : 'Por facturar'
  }
  if (pa.initialPayment != null)
    rows.push({
      'pago.nombre': 'Pago inicial',
      'pago.concepto': 'Pago inicial',
      'pago.disparador': 'Al firmar el acta de inicio',
      'pago.forma': 'Acta de inicio firmada',
      'pago.monto': money(pa.initialPayment),
      'pago.fecha': dLongCap(initialInv?.invoiceDate),
      'pago.fecha_acta': dDayMonth(initialInv?.invoiceDate),
      'pago.fecha_factura': dDayMonth(initialInv?.invoiceDate),
      'pago.fecha_pago': initialInv?.paidDate ? lower(dDayMonth(initialInv.paidDate)) : '',
      'pago.fecha_vence': initialInv?.invoiceDate ? lower(dDayMonth(addDays(initialInv.invoiceDate, pa.creditDays ?? 0))) : '',
      'pago.estado': status(initialInv),
    })
  const milestoneInvoices = data.invoices.filter((i) => i.concept === 'milestone').sort((a, b) => a.position - b.position)
  const ms = [...data.milestones].sort((a, b) => (a.plannedDelivery ?? '').localeCompare(b.plannedDelivery ?? ''))
  ms.forEach((m, i) => {
    const inv = milestoneInvoices[i]
    const label = milestoneLabel(data, m)
    rows.push({
      'pago.nombre': label,
      'pago.concepto': `${label}${m.title ? ` · ${m.title}` : ''}`,
      'pago.disparador': `Al aceptar el ${label}`,
      'pago.forma': `Acta de aceptación del ${label}`,
      'pago.monto': money(m.paymentAmount),
      'pago.fecha': dLongCap(m.plannedDelivery),
      'pago.fecha_acta': dDayMonth(m.actaDate),
      'pago.fecha_factura': dDayMonth(inv?.invoiceDate),
      'pago.fecha_pago': inv?.paidDate ? lower(dDayMonth(inv.paidDate)) : '',
      'pago.fecha_vence': inv?.invoiceDate ? lower(dDayMonth(addDays(inv.invoiceDate, pa.creditDays ?? 0))) : '',
      'pago.estado': status(inv),
    })
  })
  return rows
}

function contactRows(data: ProjectData): Row[] {
  return data.contacts.map((c) => ({
    'rol.papel': c.role,
    'rol.persona': c.name,
    'rol.puesto': c.position ?? '',
    'rol.correo': c.email ?? '',
    'rol.telefono': c.phone ?? '',
    'contacto.papel': c.role,
    'contacto.nombre': c.name,
    'contacto.puesto': c.position ?? '',
    'contacto.correo': c.email ?? '',
    'contacto.telefono': c.phone ?? '',
  }))
}

function pendingRows(data: ProjectData, r: ControlResult, onlyOpen: boolean): Row[] {
  const segName = (id: string | null) => data.segments.find((s) => s.id === id)?.name ?? ''
  return data.pendings
    .filter((p) => !onlyOpen || !p.receivedOn || p.receivedOn > r.cutoff)
    .filter((p) => !p.requestedOn || p.requestedOn <= r.cutoff)
    .map((p) => {
      const c = r.pendings.get(p.id)
      const contact = data.contacts.find((x) => x.id === p.contactId)
      const seg = segName(c?.blockingSegmentId ?? null)
      const late = c?.overdueDays ?? 0
      return {
        'pendiente.que': p.description,
        'pendiente.texto': p.description,
        'pendiente.quien': contact?.name ?? '',
        'pendiente.responsable': contact?.name ?? '',
        'pendiente.responsable_puesto': contact?.position ?? '',
        'pendiente.fecha': dLongCap(p.dueOn),
        'pendiente.fecha_compromiso': dShortDay(p.dueOn),
        'pendiente.atraso': late > 0 ? `${late} ${late === 1 ? 'día hábil' : 'días hábiles'}` : 'Sin atraso',
        'pendiente.efecto': seg
          ? `Desde el ${dLongNoYear(p.dueOn ? addDays(p.dueOn, 1) : null)}, cada día hábil de espera recorre un día hábil el ${seg}.`
          : '',
        'pendiente.tipo': 'Pendiente del cliente',
      }
    })
}

/* ------------------------------------------------------- por documento */

type Ctx = { doc: ProjectDocument; env: DocEnv; r: ControlResult; f: Row; lists: Record<string, Row[]> }

function d01(c: Ctx) {
  const { env, doc, f, lists } = c
  const pr = env.proposals.find((x) => x.id === doc.context.proposalId) ?? null
  const pros = pr ? env.prospects.find((x) => x.id === pr.prospectId) : null
  f['documento.tipo'] = doc.context.variant ?? pr?.variant ?? 'preliminar'
  f['documento.sustituye'] = f['documento.tipo'] === 'definitiva' ? 'propuesta preliminar' : ''
  if (pr) {
    const est = estimate({
      template: STANDARD_TEMPLATE,
      units: pr.units,
      size: pr.size,
      base: BASE_HOURS,
      hourlyCost: pr.hourlyCost,
      reservePct: pr.reservePct,
      poolPct: pr.poolPct,
      directCosts: pr.directCosts,
      targetMargin: pr.targetMargin,
      rowOverrides: pr.rowOverrides,
      price: pr.price,
    })
    f['proyecto.precio_total'] = money(est.price)
    f['proyecto.duracion_semanas'] = String(pr.units.weeks)
    f['proyecto.duracion'] = `${pr.units.weeks} semanas`
    f['proyecto.numero_hitos'] = String(pr.units.milestones)
    f['proyecto.numero_pagos'] = words(pr.payments.length)
    f['mensualidad.monto'] = money(pr.monthlyFee)
    f['documento.vigencia_fecha'] = dLong(pr.validUntil)
    f['documento.vigencia_dias'] = pr.validUntil ? String(diffDays(pr.date, pr.validUntil)) : ''
    f['documento.fecha'] = dLongCap(doc.sentOn ?? pr.date)
    lists.pagos = pr.payments.map((p) => ({ 'pago.disparador': p.trigger, 'pago.monto': money(p.amount), 'pago.concepto': p.label }))
  }
  if (pros && !f['cliente.decide.nombre']) {
    f['cliente.decide.nombre'] = pros.decisionMaker || pros.contactName
    f['cliente.decide.puesto'] = pros.decisionMakerRole || pros.contactRole
  }
  if (pros && !f['cliente.nombre']) f['cliente.nombre'] = pros.company
  // Lo que dice la propuesta (objetivo, problema, cómo, resultado, alcance, terceros, condiciones).
  if (pr?.content) {
    const cd = contentToDoc(pr.content, pros ?? null)
    for (const [k, v] of Object.entries(cd.fields)) if (v) f[k] = v
    for (const [k, v] of Object.entries(cd.lists)) if (v.length) lists[k] = v
  }
}

function d02(c: Ctx) {
  c.lists.roles = contactRows(c.env.data)
  c.lists.pendientes = pendingRows(c.env.data, c.r, false).slice(0, 8)
}

function d03(c: Ctx) {
  const { env, r, f, lists } = c
  const data = env.data
  const segs = segmentsSorted(data)
  lists.versiones = data.documents
    .filter((d) => d.code === 'D03' && d.status !== 'draft')
    .sort((a, b) => a.version - b.version)
    .map((d) => ({
      'version.numero': `v${d.version}`,
      'version.fecha': dLongCap(d.signedOn ?? d.sentOn),
      'version.cambio': d.notes || (d.version === 1 ? 'Primera línea base.' : ''),
      'version.respaldo': d.status === 'signed' ? 'Firmada' : 'Enviada',
    }))
  lists.desglose = segs.map((s, i) => {
    const m = data.milestones.find((x) => x.segmentId === s.id)
    const dates = data.wbs.filter((w) => w.segmentId === s.id).map((w) => w.plannedDate).filter(Boolean).sort() as string[]
    const w1 = weekOf(data, dates[0]),
      w2 = weekOf(data, dates[dates.length - 1])
    return {
      'bloque.numero': String(i),
      'bloque.semanas': w1 && w2 ? (w1 === w2 ? `Semana ${w1}` : `Semanas ${w1} a ${w2}`) : '',
      'bloque.nombre': m ? `${s.name} · ${m.title}` : s.title || s.name,
      'bloque.pago': m?.paymentAmount ? `${money(m.paymentAmount)} al aceptarlo` : 'Sin pago propio',
    }
  })
  lists.cronograma = segs.map((s) => {
    const dates = data.wbs.filter((w) => w.segmentId === s.id).map((w) => w.plannedDate).filter(Boolean).sort() as string[]
    const contact = data.contacts.find((x) => roleOf(x) === 'responsible')
    return {
      'actividad.nombre': s.title || s.name,
      'actividad.fechas': dates.length ? `${dShortNoYear(dates[0])} al ${dShortNoYear(dates[dates.length - 1])}` : '',
      'actividad.responsable': contact?.name ?? '',
    }
  })
  lists.fechas_cliente = data.pendings.map((p) => ({
    'fecha_cliente.que': p.description,
    'fecha_cliente.quien': data.contacts.find((x) => x.id === p.contactId)?.name ?? '',
    'fecha_cliente.fecha': dLongCap(p.dueOn),
    'fecha_cliente.para': p.blocksKey ? (data.wbs.find((w) => w.key === p.blocksKey)?.name ?? p.blocksKey) : '',
  }))
  lists.riesgos = data.risks
    .filter((x) => x.riskClass === 'risk' && x.status !== 'closed')
    .map((x) => ({
      'riesgo.que': x.description,
      'riesgo.cliente': x.dependsOn === 'client' ? x.action : '',
      'riesgo.nosotros': x.dependsOn === 'us' ? x.action : '',
      'riesgo.vigila': data.members.find((m) => m.id === x.ownerId)?.name ?? '',
    }))
  lists.reglas_aceptacion = [{ 'regla.dias_revision': f['regla.dias_revision'], 'regla.dias_verificacion': f['regla.dias_verificacion'], 'regla.dias_garantia': f['regla.dias_garantia'] }]
  lists.entregables_criterios = deliverables(data).map((d) => ({
    'entregable.numero': d.number,
    'entregable.nombre': d.name,
    'entregable.criterio': '',
    'entregable.responsable': '',
    'entregable.fecha': dShortDay(d.planned),
    'entregable.criterios_clave': criteriaRange(data, d.number),
  }))
  f['bolsa.horas'] = hours(r.budget.poolHours)
  f['cronograma.inhabiles'] = data.project.nonWorkingDays.map((d) => dLongCap(d)).join('; ')
  f['semana.fecha_inicio'] = dShortNoYear(data.project.startDate)
}

/** Entregables del desglose, numerados como sus claves (1.3-A02 → 1.3). */
function deliverables(data: ProjectData, segmentId?: string | null) {
  const out = new Map<string, { number: string; name: string; planned: ISODate | null; segmentId: string | null; types: Set<string> }>()
  for (const w of [...data.wbs].sort((a, b) => a.position - b.position)) {
    if (segmentId && w.segmentId !== segmentId) continue
    const number = w.key.split('-')[0]
    const d = out.get(number) ?? { number, name: w.deliverable, planned: null, segmentId: w.segmentId, types: new Set<string>() }
    d.planned = maxDate(d.planned, w.plannedDate)
    if (w.activityType) d.types.add(w.activityType)
    out.set(number, d)
  }
  return [...out.values()]
}

function criteriaRange(data: ProjectData, deliverable: string): string {
  const codes = data.criteria.filter((c) => c.deliverable === deliverable).map((c) => c.code).sort()
  return codes.length > 1 ? `${codes[0]} a ${codes[codes.length - 1]}` : (codes[0] ?? '')
}

function milestoneOf(c: Ctx): Milestone | null {
  return c.env.data.milestones.find((m) => m.id === c.doc.context.milestoneId) ?? null
}

function milestoneFields(c: Ctx, m: Milestone) {
  const { env, r, f } = c
  const data = env.data
  const mc = r.milestones.get(m.id)
  const label = milestoneLabel(data, m)
  f['hito.numero'] = label
  f['hito.nombre'] = m.title
  f['hito.nombre_minusculas'] = lower(m.title)
  f['hito.objetivo'] = m.result ?? ''
  f['hito.fecha_entrega'] = dDayMonth(m.actualDelivery ?? m.plannedDelivery)
  f['hito.fecha_entrega_larga'] = dLong(m.actualDelivery ?? m.plannedDelivery)
  f['hito.fecha_aceptacion'] = dDayMonth(m.actaDate)
  f['hito.fecha_vencimiento'] = dDayMonth(mc?.acceptanceDeadline)
  f['hito.dias_para_aceptar'] = mc?.daysToAccept == null ? '' : String(mc.daysToAccept)
  const spec = data.documents.filter((d) => d.code === 'D04' && d.context.milestoneId === m.id && d.status !== 'draft').sort((a, b) => b.version - a.version)[0]
  f['hito.especificacion'] = spec ? fileBase(spec, data) : ''
  f['hito.fecha_especificacion'] = spec ? dDate(spec.signedOn ?? spec.sentOn) : ''
  const crit = data.criteria.filter((x) => x.milestoneId === m.id)
  f['hito.total_criterios'] = String(crit.length)
  f['criterios.total'] = String(crit.length)
  f['criterios.cumplen'] = String(crit.filter((x) => x.result === 'pass').length)
  f['guion.casos_total'] = String(crit.length)
  f['guion.casos_cumplen'] = String(crit.filter((x) => x.result === 'pass').length)
  f['guion.defectos'] = String(crit.filter((x) => x.classification === 'defect').length)
  f['satisfaccion.calificacion'] = m.clientRating == null ? '' : String(m.clientRating)
  f['satisfaccion.comentario'] = m.clientComment ?? ''
  f['leccion.fecha_aceptacion'] = dShortDay(m.actaDate)
  if (m.paymentAmount != null) {
    f['pago.concepto'] = `${label} · ${m.title}`
    f['pago.monto'] = money(m.paymentAmount)
    f['pago.monto_texto'] = moneyWords(m.paymentAmount)
    f['pago.tasa_iva'] = '16 %'
    f['pago.iva'] = money(m.paymentAmount * 0.16)
    f['pago.total'] = money(m.paymentAmount * 1.16)
  }
  return crit
}

function d04(c: Ctx) {
  const m = milestoneOf(c)
  if (!m) return
  const data = c.env.data
  const crit = milestoneFields(c, m)
  c.lists.criterios = crit.map((x) => ({ 'criterio.clave': x.code, 'criterio.accion': x.action, 'criterio.resultado': x.expected }))
  c.lists.entregables = deliverables(data, m.segmentId).map((d) => ({
    'entregable.numero': d.number,
    'entregable.nombre': d.name,
    'entregable.criterios': String(data.criteria.filter((x) => x.deliverable === d.number).length),
  }))
  c.lists.accesos = data.pendings
    .filter((p) => data.wbs.find((w) => w.key === p.blocksKey)?.segmentId === m.segmentId)
    .map((p) => ({
      'acceso.que': p.description,
      'acceso.para_que': p.blocksKey ?? '',
      'acceso.quien': data.contacts.find((x) => x.id === p.contactId)?.name ?? '',
      'acceso.fecha': dLongCap(p.dueOn),
      'acceso.estado': p.receivedOn ? 'Entregado' : 'Pendiente',
    }))
}

function d05(c: Ctx) {
  const { env, r, f, lists } = c
  const data = env.data
  const ch = data.changes.find((x) => x.id === c.doc.context.changeId)
  if (!ch) return
  const contact = data.contacts.find((x) => x.id === ch.requestedById)
  const seg = data.segments.find((s) => s.id === ch.segmentId)
  const m = seg ? data.milestones.find((x) => x.segmentId === seg.id) : null
  const rate = r.budget.plannedHours ? Math.round((data.project.params.price ?? 0) / r.budget.plannedHours) : null
  const amount = ch.amount ?? (ch.hours && rate ? ch.hours * rate : null)
  const price = r.budget.currentPrice
  const fNum = scopeFolio(data, ch)
  f['cambio.folio'] = fNum
  f['cambio.nombre'] = ch.description.length > 60 ? `${ch.description.slice(0, 57)}…` : ch.description
  f['solicitante.nombre'] = contact?.name ?? ''
  f['solicitante.puesto'] = lower(contact?.position)
  f['solicitud.medio'] = ch.channel ? CHANNEL[ch.channel] : ''
  f['solicitud.fecha_registro'] = dLongCap(ch.date)
  f['solicitud.peticion'] = `«${ch.description}»`
  f['clasificacion.tipo'] = ch.kind ? REQUEST_KIND[ch.kind] : ''
  f['impacto.horas'] = hours(ch.hours)
  f['impacto.precio'] = money(amount)
  f['impacto.precio_texto'] = moneyWords(amount)
  f['impacto.tarifa'] = money(rate)
  f['impacto.hito'] = seg?.name ?? ''
  const newDate = m?.plannedDelivery && ch.businessDaysMoved ? addDays(m.plannedDelivery, Math.round((ch.businessDaysMoved * 7) / 5)) : null
  f['impacto.hito_fecha_actual_corta'] = dShortNoYear(m?.plannedDelivery)
  f['impacto.hito_fecha_actual_texto'] = dLongNoYear(m?.plannedDelivery).split(' ').slice(0, 2).join(' ')
  f['impacto.hito_fecha_nueva'] = dShortNoYear(newDate ?? m?.plannedDelivery)
  f['impacto.hito_fecha_nueva_larga'] = dLongNoYear(newDate ?? m?.plannedDelivery)
  f['impacto.hito_fecha_nueva_texto'] = dDate(newDate ?? m?.plannedDelivery)
  f['decision.fecha_limite'] = dLong(ch.responseDate)
  const d03 = data.documents.filter((d) => d.code === 'D03' && d.status !== 'draft').sort((a, b) => b.version - a.version)[0]
  f['linea_base.version_actual'] = d03 ? `D03 v${d03.version}` : 'D03 v1'
  f['linea_base.fecha'] = dLong(data.project.baselineSignedOn)
  lists.linea_base = [
    {
      'linea_base.total_actual': money(price),
      'linea_base.total_nuevo': money(price + (amount ?? 0)),
      'linea_base.version_actual': f['linea_base.version_actual'],
      'linea_base.version_nueva': d03 ? `D03 v${d03.version + 1}` : 'D03 v2',
      'linea_base.orden_compra': f['facturacion.orden_compra'],
      'linea_base.orden_compra_monto': money(price),
    },
  ]
  lists.decision_textos = [
    { 'cambio.folio': fNum, 'impacto.precio_texto': moneyWords(amount), 'impacto.hito': seg?.name ?? '', 'impacto.hito_fecha_nueva_texto': f['impacto.hito_fecha_nueva_texto'] },
  ]
}

function d06(c: Ctx) {
  const { env, r, f, lists, doc } = c
  const data = env.data
  const week = doc.context.week ?? weekOf(data, r.cutoff) ?? 1
  const weekStart = addDays(r.cutoff, -4)
  f['reporte.numero'] = String(week)
  f['reporte.semana'] = String(week)
  f['reporte.fecha_corte'] = dLongCap(r.cutoff)
  const light = r.generalLight
  f['semaforo.color'] = LIGHT[light]
  f['correo.estado'] = lower(LIGHT[light])
  const running = r.segments.find((s) => data.milestones.some((m) => m.segmentId === s.segmentId && !(m.actualDelivery && m.actualDelivery <= r.cutoff))) ?? null
  f['semaforo.hito'] = running?.name ?? ''
  f['semaforo.avance_contra_plan'] = running?.vsPlan == null ? '—' : running.vsPlan.toFixed(2)
  const ms = [...data.milestones].sort((a, b) => (a.plannedDelivery ?? '').localeCompare(b.plannedDelivery ?? ''))
  lists.hitos = ms.map((m) => {
    const sp = r.segments.find((s) => s.segmentId === m.segmentId)
    const mc = r.milestones.get(m.id)
    const delivered = m.actualDelivery && m.actualDelivery <= r.cutoff
    const accepted = m.actaDate && m.actaDate <= r.cutoff
    const forecast = maxDate(m.forecastDelivery, mc?.minForecast)
    const estado = accepted ? 'Aceptado' : delivered ? 'En pruebas' : (sp?.earned ?? 0) > 0 || (sp?.plannedToDate ?? 0) > 0 ? 'En curso' : 'Sin iniciar'
    return {
      'hito.numero': milestoneLabel(data, m),
      'hito.nombre': m.title,
      'hito.fecha_linea_base': dShort(m.plannedDelivery),
      'hito.fecha_prevista': dShort(delivered ? m.actualDelivery : forecast),
      'hito.nota_fecha': delivered ? 'Entregado' : '',
      'hito.avance_planeado': pct(sp?.plannedPct ?? 0),
      'hito.avance_real': pct(sp?.earnedPct ?? 0),
      'hito.avance_contra_plan': sp?.vsPlan == null ? '—' : sp.vsPlan.toFixed(2),
      'hito.estado': estado,
      'hito.nota_estado': accepted ? dShort(m.actaDate) : delivered ? `Acepta a más tardar el ${dShortNoYear(mc?.acceptanceDeadline)}` : '',
    }
  })
  lists.hechos = data.wbs
    .filter((w) => {
      const fo = r.wbs.get(w.id)?.finishedOn
      return fo && fo >= weekStart && fo <= r.cutoff
    })
    .slice(0, 6)
    .map((w) => ({ 'hecho.resultado': `${w.name}.` }))
  const nextEnd = addDays(r.cutoff, 7)
  lists.siguientes = data.wbs
    .filter((w) => !r.wbs.get(w.id)?.finishedOn && w.plannedDate && w.plannedDate > r.cutoff && w.plannedDate <= nextEnd && w.rowClass !== 'deliverable')
    .slice(0, 5)
    .map((w) => ({ 'siguiente.resultado': `${w.name}.` }))
  lists.pendientes = pendingRows(data, r, true)
  lists.riesgos = data.risks
    .filter((x) => x.status !== 'closed' && x.riskClass === 'risk')
    .map((x) => ({
      'riesgo.que_puede_pasar': x.description,
      'riesgo.que_se_hace': x.action,
      'riesgo.quien_atiende': data.members.find((m) => m.id === x.ownerId)?.name ?? '',
    }))
  lists.cambios = data.changes
    .filter((x) => x.date <= r.cutoff && x.status !== 'done' && x.status !== 'rejected')
    .map((x) => ({
      'cambio.folio': x.kind === 'scope_change' ? scopeFolio(data, x) : folio.change(x.seq),
      'cambio.tipo': x.kind ? REQUEST_KIND[x.kind] : '',
      'cambio.peticion': x.description,
      'cambio.estado': x.status ? REQUEST_STATUS[x.status] : '',
    }))
  f['pendiente.facturas_vencidas'] = r.billing.overdueInvoices ? String(r.billing.overdueInvoices) : 'ninguna'
  const first = lists.pendientes[0]
  if (first) {
    f['semaforo.causa'] = `Falta: ${first['pendiente.que']}.`
    f['semaforo.accion'] = `Entregar: ${lower(first['pendiente.que'])}.`
    f['semaforo.responsable'] = first['pendiente.responsable']
    f['semaforo.responsable_puesto'] = first['pendiente.responsable_puesto']
    f['semaforo.fecha'] = dLongCap(data.pendings.find((p) => p.description === first['pendiente.que'])?.dueOn)
  }
  const responsible = data.contacts.find((x) => roleOf(x) === 'responsible')
  const decides = data.contacts.find((x) => roleOf(x) === 'decides')
  f['correo.para'] = responsible?.name ?? ''
  f['correo.copia'] = decides?.name ?? ''
  f['correo.destinatario'] = responsible?.name.split(' ')[0] ?? ''
}

function d07(c: Ctx) {
  const m = milestoneOf(c)
  if (!m) return
  const data = c.env.data
  const crit = milestoneFields(c, m)
  c.lists.casos = crit.map((x) => ({
    'caso.clave': x.code,
    'caso.nombre': x.note,
    'caso.pasos': x.action,
    'caso.esperado': x.expected,
    'caso.obtenido': x.result === 'pass' ? 'Cumple' : x.result === 'fail' ? `No cumple${x.obtained ? `: ${x.obtained}` : ''}` : '',
    'caso.evidencia': x.evidence,
    'caso.clasificacion': x.classification ? CRITERION_CLASS[x.classification] : '',
    'caso.nota': '',
  }))
  const fails = crit.filter((x) => x.result === 'fail')
  c.lists.criterios_no_cumplen = fails.length ? fails.map((x) => ({ 'criterio_no_cumple.clave': x.code })) : [{ 'criterio_no_cumple.clave': 'Ninguno' }]
  c.lists.observaciones = fails.map((x, i) => ({
    'observacion.numero': String(i + 1),
    'observacion.texto': x.obtained,
    'observacion.tipo': x.classification ? CRITERION_CLASS[x.classification] : '',
    'observacion.criterio': x.code,
    'observacion.estado': '',
    'observacion.nota': x.note,
  }))
  const dels = deliverables(data, m.segmentId)
  c.lists.criterios_por_entregable = dels.map((d) => {
    const cs = crit.filter((x) => x.deliverable === d.number)
    return { 'criterio_entregable.nombre': `${d.number} · ${d.name}`, 'criterio_entregable.cumplen': String(cs.filter((x) => x.result === 'pass').length), 'criterio_entregable.total': String(cs.length) }
  })
  c.lists.entregables = dels.map((d) => ({ 'entregable.numero': d.number, 'entregable.nombre': d.name, 'entregable.ambiente': m.actualDelivery ? 'Producción' : 'Pruebas', 'entregable.fecha_produccion': dDayMonth(d.planned) }))
  c.f['aviso.entrega.fecha'] = lower(dDayMonth(m.actualDelivery))
}

function d08(c: Ctx) {
  const { env, r, f, lists } = c
  const data = env.data
  const pa = data.project.params
  const approved = data.changes.filter((x) => x.kind === 'scope_change' && r.changes.get(x.id)!.approvedAmount > 0)
  const changesTotal = approved.reduce((s, x) => s + (x.amount ?? 0), 0)
  f['proyecto.precio_original'] = money(pa.price)
  f['proyecto.monto_cambios'] = money(changesTotal)
  f['proyecto.precio_final'] = money((pa.price ?? 0) + changesTotal)
  f['proyecto.linea_base_cambios'] = approved.map((x) => scopeFolio(data, x)).join(', ') || 'Ninguno'
  f['pagos.total'] = money((pa.price ?? 0) + changesTotal)
  f['pagos.pagado'] = money(r.billing.collected)
  f['pagos.por_cobrar'] = money((pa.price ?? 0) + changesTotal - r.billing.collected)
  const worst = Math.max(0, ...[...r.milestones.values()].map((x) => x.deviation ?? 0))
  f['proyecto.desviacion'] = worst ? `${worst} días hábiles` : 'sin desviación'
  lists.hitos = [...data.milestones]
    .sort((a, b) => (a.plannedDelivery ?? '').localeCompare(b.plannedDelivery ?? ''))
    .map((m) => ({
      'hito.numero': milestoneLabel(data, m),
      'hito.nombre': m.title,
      'hito.fecha_plan': dDayMonth(m.plannedDelivery),
      'hito.fecha_entrega': dDayMonth(m.actualDelivery),
      'hito.fecha_aceptacion': dDayMonth(m.actaDate),
      'hito.entregado': m.result ?? '',
    }))
  lists.garantias = data.milestones
    .filter((m) => m.actaDate)
    .map((m) => ({
      'hito.numero': milestoneLabel(data, m),
      'hito.nombre': m.title,
      'garantia.aceptado': dDayMonth(m.actaDate),
      'garantia.fin': dLongCap(addDays(m.actaDate!, pa.warrantyDays)),
    }))
  lists.cambios = approved.map((x) => ({
    'cambio.folio': scopeFolio(data, x),
    'cambio.descripcion': `«${x.description}»`,
    'cambio.aprobacion': `${data.contacts.find((k) => k.id === x.decidedById)?.name ?? ''}, ${dLongNoYear(x.responseDate)}`,
    'cambio.monto': money(x.amount),
  }))
  lists.pagos = paymentRows(data, r)
  lists.pendientes = pendingRows(data, r, true)
}

function d09(c: Ctx) {
  const { env, f, lists, doc } = c
  const data = env.data
  const month = doc.context.month ?? (env.today ?? todayInMexico()).slice(0, 7)
  const s = monthlyService(data, month)
  const { from, to, days } = monthRange(month)
  f['reporte.mes'] = monthName(month)
  f['reporte.periodo'] = `1 al ${days} de ${monthName(month).split(' de ')[0]}`
  const backups = s.routines.find((x) => /respaldo/i.test(x.routine.name))
  f['respaldos.correctos'] = backups ? String(backups.done) : ''
  f['respaldos.esperados'] = backups ? String(backups.expected) : ''
  const recovery = s.routines.find((x) => /recuperaci/i.test(x.routine.name))
  if (recovery?.last) {
    f['prueba.fecha'] = dLongCap(recovery.last.date)
    f['prueba.resultado'] = recovery.last.evidence || recovery.last.notes
  }
  f['prueba.siguiente'] = dLongCap(recovery?.nextDue)
  f['prueba.frecuencia'] = 'cada bimestre'
  f['mensualidad.bolsa_horas'] = hours(s.pool.total)
  f['mensualidad.bolsa_horas_usadas'] = hours(s.pool.used)
  f['mensualidad.bolsa_horas_disponibles'] = hours(s.pool.available)
  f['mensualidad.bolsa_porcentaje_usado'] = s.pool.usedPct == null ? '' : String(Math.round(s.pool.usedPct * 100))
  f['garantia.defectos'] = String(s.warrantyDefects.length)
  f['garantia.detalle'] = s.warrantyDefects.map((t) => t.change.description).join('; ')
  f['garantia.folio'] = s.warrantyDefects.map((t) => t.folio).join(', ')
  const fmtGroup = (name: string, g: typeof s.urgent, business: boolean, limitText: string) => ({
    'solicitud_tipo.nombre': name,
    'solicitud_tipo.recibidas': String(g.received),
    'solicitud_tipo.respuesta': g.received ? `${fmtMinutes(g.avgResponse, business)} en promedio; la más larga, ${fmtMinutes(g.maxResponse, business)}` : '—',
    'solicitud_tipo.compromiso_respuesta': limitText,
    'solicitud_tipo.solucion': g.received ? fmtMinutes(g.maxSolution, business) : '—',
    'solicitud_tipo.abiertas': String(g.open),
    'solicitud_tipo.estado': g.complies ? 'Cumple' : 'No cumple',
  })
  const pa = data.project.params
  lists.solicitudes_resumen = [
    fmtGroup('Urgentes', s.urgent, false, `${pa.urgentResponseHours} hora en horario hábil; ${pa.urgentResponseOffHours} fuera`),
    fmtGroup('Normales', s.normal, true, `${pa.normalResponseDays} día hábil`),
  ]
  lists.bolsa_usos = s.pool.uses.map((u) => ({
    'uso.fecha': u.from === u.to ? dShortNoYear(u.from) : `${dShortNoYear(u.from).split(' ')[0]} al ${dShortNoYear(u.to)}`,
    'uso.folio': u.folio,
    'uso.descripcion': u.description,
    'uso.horas': hours(u.hours),
  }))
  const incidents = data.risks.filter((x) => x.riskClass === 'incident' && x.date >= from && x.date <= to)
  f['disponibilidad.avisos'] = String(incidents.length)
  lists.avisos = incidents.map((x) => ({ 'aviso.fecha': dShortDay(x.date), 'aviso.causa': x.description, 'aviso.solucion': x.action, 'aviso.folio': folio.risk(x.seq) }))
  const updates = s.routines.find((x) => /actualizaci/i.test(x.routine.name))
  f['actualizaciones.cantidad'] = updates ? String(updates.done) : ''
  lists.actualizaciones = (updates?.runs ?? []).filter((x) => x.done).map((x) => ({ 'actualizacion.fecha': dDate(x.date).replace(/ de \d{4}$/, ''), 'actualizacion.que': x.evidence || x.notes }))
}

function d10(c: Ctx) {
  const { env, f, lists } = c
  const data = env.data
  const ppl = people(data)
  f['traspaso.vendio'] = ppl.sales?.name ?? ''
  f['traspaso.vendio_sombrero'] = 'Venta y cuenta'
  f['traspaso.recibe'] = ppl.contacto?.name ?? ''
  f['recibido.nombre'] = ppl.contacto?.name ?? ''
  const pr = env.proposals.find((p) => env.prospects.find((x) => x.id === p.prospectId)?.projectId === data.project.id && p.status === 'accepted')
  if (pr) f['vendido.propuesta'] = `${data.project.key}-D01, versión v${pr.version}`
  f['vendido.plazo'] = f['proyecto.duracion']
  lists.contactos = contactRows(data)
  lists.hitos = segmentRows(data, false).map((x) => ({ ...x, 'hito.fecha': lower(dShortDay(data.milestones.find((m) => m.title === x['hito.nombre'])?.plannedDelivery)) }))
}

function d12(c: Ctx) {
  const { env, f, lists } = c
  const data = env.data
  const ppl = people(data)
  const construye = ppl.holder('construction')?.name ?? ''
  const revisa = ppl.holder('quality')?.name ?? ''
  f['calidad.construye'] = construye
  f['calidad.revisa'] = revisa
  f['revision.responsable'] = lower(revisa)
  const segs = segmentsSorted(data)
  lists.matriz = segs
    .map((s) => {
      const m = data.milestones.find((x) => x.segmentId === s.id)
      const types = new Set(data.wbs.filter((w) => w.segmentId === s.id && w.activityType).map((w) => w.activityType!))
      if (!types.size) return null
      const row: Row = {
        'entregable.nombre': m ? `${s.name}: ${m.title}` : s.title || s.name,
        'entregable.listas': [...types].map((t) => QUALITY_LISTS[t].code).sort().join('; '),
        'entregable.construye': construye,
        'entregable.revisa': revisa,
        'entregable.prueba_cliente': m ? 'Con el guion de casos' : '',
        'entregable.evidencia': 'Listas cumplidas; evidencia en la bitácora',
      }
      return row
    })
    .filter((x): x is Row => x !== null)
  lists.listas = (Object.keys(QUALITY_LISTS) as (keyof typeof QUALITY_LISTS)[]).map((t) => ({ 'lista.clave': QUALITY_LISTS[t].code, 'lista.nombre': ACTIVITY_TYPE[t], 'lista.version': 'v1' }))
  lists.listo = data.milestones.map((m) => ({
    'hito.numero': milestoneLabel(data, m),
    'hito.nombre': m.title,
    'listo.criterios': String(data.criteria.filter((x) => x.milestoneId === m.id).length),
  }))
  const analysis = ppl.holder('analysis')?.name ?? ''
  const responsible = data.contacts.find((x) => roleOf(x) === 'responsible')
  const decides = data.contacts.find((x) => roleOf(x) === 'decides')
  lists.guiones = data.milestones.map((m) => ({
    'hito.numero': milestoneLabel(data, m),
    'guion.escribe': analysis,
    'guion.entrega': dShortDay(m.plannedDelivery),
    'guion.semana': weekOf(data, m.plannedDelivery) ? `Semana ${weekOf(data, m.plannedDelivery)}` : '',
    'guion.aviso_para': responsible?.name ?? '',
    'guion.aviso_copia': decides?.name ?? '',
  }))
  lists.firmas_reglas = data.members.map((m) => ({
    'integrante.nombre': m.name,
    'integrante.papel': data.hats.filter((h) => h.holderId === m.id).map((h) => h.hat).length
      ? data.hats
          .filter((h) => h.holderId === m.id)
          .map((h) => ({ sales: 'Venta y cuenta', project_lead: 'Líder de proyecto', analysis: 'Análisis', architecture: 'Arquitectura', construction: 'Construcción', quality: 'Revisión de calidad', administration: 'Administración', support: 'Soporte' })[h.hat])
          .join(', ')
      : '',
  }))
  lists.aprobacion = [{ 'aprobacion.nombre': ppl.sales?.name ?? '', 'aprobacion.papel': 'Aprueba en las puertas' }]
}

function d14(c: Ctx) {
  const { env, r, f, lists } = c
  const data = env.data
  const m = milestoneOf(c)
  if (m) milestoneFields(c, m)
  const segId = m?.segmentId ?? null
  const ppl = people(data)
  f['leccion.asistente_1'] = ppl.lead?.name ?? ''
  f['leccion.asistente_1_papel'] = 'líder de proyecto'
  f['leccion.asistente_2'] = ppl.contacto?.name ?? ''
  f['aprobo.nombre'] = ppl.sales?.name ?? ''
  const sp = segId ? r.segments.find((s) => s.segmentId === segId) : null
  const mc = m ? r.milestones.get(m.id) : null
  const ind = (k: string) => r.indicators.find((i) => i.key === k)
  lists.indicadores = [
    { 'indicador.nombre': 'Desviación de hito', 'indicador.valor': String(mc?.deviation ?? ind('deviation')?.value ?? ''), 'indicador.unidad': 'días hábiles', 'indicador.meta': '0', 'indicador.estado': (mc?.deviation ?? 0) > 0 ? 'Fuera de meta' : 'En meta' },
    { 'indicador.nombre': 'Retrabajo', 'indicador.valor': pct(sp?.rework ?? ind('rework')?.value ?? null, 1), 'indicador.unidad': 'de las horas reales', 'indicador.meta': 'Menos de 15 %', 'indicador.estado': ((sp?.rework ?? 0) as number) >= 0.15 ? 'Fuera de meta' : 'En meta' },
    { 'indicador.nombre': 'Días para aceptar', 'indicador.valor': mc?.daysToAccept == null ? '' : String(mc.daysToAccept), 'indicador.unidad': 'días hábiles', 'indicador.meta': `${data.project.params.clientReviewDays} o menos`, 'indicador.estado': (mc?.daysToAccept ?? 0) > data.project.params.clientReviewDays ? 'Fuera de meta' : 'En meta' },
    { 'indicador.nombre': 'Satisfacción', 'indicador.valor': m?.clientRating == null ? '' : String(m.clientRating), 'indicador.unidad': 'de 10', 'indicador.meta': '9 o más', 'indicador.estado': m?.clientRating != null && m.clientRating < 9 ? 'Fuera de meta' : 'En meta' },
  ]
  const acts = data.wbs.filter((w) => w.rowClass !== 'deliverable' && (!segId || w.segmentId === segId))
  const blocks = [...new Set(acts.map((w) => w.block).filter((b): b is number => b != null))].sort((a, b) => a - b)
  lists.horas = blocks.map((b) => {
    const xs = acts.filter((w) => w.block === b)
    const est = xs.reduce((s, w) => s + (w.estimatedHours ?? 0), 0)
    const real = xs.reduce((s, w) => s + (r.wbs.get(w.id)?.totalRealHours ?? 0), 0)
    return { 'horas.bloque': BLOCKS[b].replace('. ', ' · '), 'horas.estimadas': hours(est), 'horas.reales': hours(real), 'horas.eficiencia': real ? (est / real).toFixed(2) : '—' }
  })
  const totalEst = acts.reduce((s, w) => s + (w.estimatedHours ?? 0), 0)
  const totalReal = acts.reduce((s, w) => s + (r.wbs.get(w.id)?.totalRealHours ?? 0), 0)
  f['horas.total_nota'] = `Plan ${hours(totalEst)} h; reales ${hours(totalReal)} h${totalReal ? `; eficiencia ${(totalEst / totalReal).toFixed(2)}` : ''}.`
  const cal = r.calibration.filter((x) => x.activityType !== 'total' && x.efficiency != null && x.advice.startsWith('Fuera'))
  f['indicadores.detalle'] = cal.map((x) => `${ACTIVITY_TYPE[x.activityType as keyof typeof ACTIVITY_TYPE]}: ${x.efficiency?.toFixed(2)}`).join('; ')
}

const BUILDERS: Partial<Record<ProjectDocument['code'], (c: Ctx) => void>> = {
  D01: d01,
  D02: d02,
  D03: d03,
  D04: d04,
  D05: d05,
  D06: d06,
  D07: d07,
  D08: d08,
  D09: d09,
  D10: d10,
  D12: d12,
  D14: d14,
}

/** Lo que se llena solo para un documento. */
export function autofill(doc: ProjectDocument, env: DocEnv): DocData {
  const today = env.today ?? todayInMexico()
  const cutoff = cutoffFor(doc, env.data, today)
  const r = computeControl(env.data, cutoff)
  const f = common(doc, env, r)
  const lists: Record<string, Row[]> = {
    hitos: segmentRows(env.data, true),
    pagos: paymentRows(env.data, r),
    pendientes: pendingRows(env.data, r, true),
  }
  BUILDERS[doc.code]?.({ doc, env, r, f, lists })
  // Sin vacíos: un campo calculado vacío cuenta como faltante.
  for (const k of Object.keys(f)) if (f[k] === '' || f[k] == null) delete f[k]
  return { fields: f, lists }
}

/** Lo que se ve: lo congelado al enviarlo o, en borrador, documento → proyecto → automático. */
export function resolveDoc(doc: ProjectDocument, env: DocEnv): DocData {
  if (doc.snapshot) return doc.snapshot
  const auto = autofill(doc, env)
  const facts = env.data.project.facts ?? EMPTY
  return {
    fields: { ...auto.fields, ...facts.fields, ...doc.overrides.fields },
    lists: { ...auto.lists, ...facts.lists, ...doc.overrides.lists },
  }
}

export type FieldSource = 'document' | 'project' | 'auto' | 'missing'
export function fieldSource(doc: ProjectDocument, env: DocEnv, auto: DocData, name: string): FieldSource {
  if (name in doc.overrides.fields) return 'document'
  if (env.data.project.facts && name in env.data.project.facts.fields) return 'project'
  if (name in auto.fields) return 'auto'
  return 'missing'
}


/** Congela lo enviado que no se congeló al registrarlo (semillas e importaciones). */
export function freezeSent(env: DocEnv): ProjectData {
  const data = env.data
  return {
    ...data,
    documents: data.documents.map((d) => (d.status !== 'draft' && !d.snapshot && DOCUMENTS[d.code].template ? { ...d, snapshot: resolveDoc(d, env) } : d)),
  }
}
