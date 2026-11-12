/**
 * Las cinco puertas (Procedimientos y puertas). La puerta 4 se repite por hito.
 * Las casillas las palomea alguien distinto a quien trabajó; las aprueba Santiago.
 * Aquí además se sugiere, con los datos del proyecto, qué casillas ya parecen cumplidas.
 */
import { GATE_DEFS } from './catalogs'
import type { ControlResult } from './control'
import { fmtDate } from './format'
import type { Gate, GateNumber, Milestone, ProjectData } from './types'

export type GateState = 'approved' | 'requested' | 'ready' | 'pending'

export interface GateRow {
  gate: GateNumber
  milestone: Milestone | null
  record: Gate | null
  name: string
  state: GateState
  checked: number
  total: number
  /** Una pista por casilla, sacada de los datos (null si no se puede saber) */
  hints: ({ ok: boolean; text: string } | null)[]
}

const docSigned = (d: ProjectData, code: string, pred: (ctx: Record<string, unknown>) => boolean = () => true) =>
  d.documents.find((x) => x.code === code && x.status === 'signed' && pred(x.context as Record<string, unknown>))
const docAny = (d: ProjectData, code: string, pred: (ctx: Record<string, unknown>) => boolean = () => true) =>
  d.documents.find((x) => x.code === code && x.status !== 'draft' && pred(x.context as Record<string, unknown>))

function hintsFor(gate: GateNumber, d: ProjectData, r: ControlResult, m: Milestone | null): GateRow['hints'] {
  const responsible = d.contacts.find((c) => c.roleKey === 'responsible' || /^responsable/i.test(c.role))
  switch (gate) {
    case 1: {
      const d01 = d.documents.find((x) => x.code === 'D01' && x.status !== 'draft')
      return [
        d01 ? { ok: d01.status === 'signed', text: `D01 v${d01.version} ${d01.status === 'signed' ? 'aceptada' : 'enviada, sin aceptación registrada'}` } : null,
        responsible ? { ok: true, text: `Responsable del cliente: ${responsible.name}` } : { ok: false, text: 'Falta el responsable del cliente en Proyecto' },
      ]
    }
    case 2: {
      const d02 = docSigned(d, 'D02')
      const initial = d.invoices.find((i) => i.concept === 'initial')
      const paid = initial?.paidDate && initial.paidDate <= r.cutoff
      return [
        d02 ? { ok: true, text: `D02 v${d02.version} firmada el ${fmtDate(d02.signedOn)}` } : { ok: false, text: 'No hay D02 firmada' },
        initial
          ? { ok: Boolean(paid || initial.purchaseOrder), text: paid ? `Pago inicial cobrado el ${fmtDate(initial.paidDate)}` : initial.purchaseOrder ? `Orden de compra ${initial.purchaseOrder}` : 'Pago inicial sin cobrar ni orden de compra' }
          : null,
        responsible ? { ok: true, text: `Responsable nombrado: ${responsible.name}` } : null,
        d.pendings.length ? { ok: d.pendings.every((p) => p.dueOn), text: `${d.pendings.length} pendientes del cliente con fecha compromiso` } : { ok: false, text: 'Sin pendientes del cliente registrados' },
      ]
    }
    case 3: {
      const d03 = docSigned(d, 'D03')
      return [
        d03 ? { ok: true, text: `D03 v${d03.version} firmada el ${fmtDate(d03.signedOn)}` } : { ok: false, text: 'No hay D03 firmada' },
        d.project.baselineSignedOn
          ? { ok: r.baselineCheck === 'Cuadra con el Desglose', text: `Línea base del ${fmtDate(d.project.baselineSignedOn)}: ${r.baselineCheck.toLowerCase()}` }
          : { ok: false, text: 'Falta la fecha de firma de la línea base en Proyecto' },
      ]
    }
    case 4: {
      if (!m) return [null]
      const d07 = docSigned(d, 'D07', (c) => c.milestoneId === m.id)
      const mc = r.milestones.get(m.id)
      const expired = mc?.acceptanceDeadline && mc.acceptanceDeadline < r.cutoff && !m.actaDate
      return [
        d07
          ? { ok: true, text: `D07 firmada el ${fmtDate(d07.signedOn)}` }
          : m.actaDate
            ? { ok: true, text: `Acta del ${fmtDate(m.actaDate)}` }
            : expired
              ? { ok: true, text: `Venció el plazo el ${fmtDate(mc!.acceptanceDeadline)}: aceptación por plazo vencido` }
              : m.actualDelivery
                ? { ok: false, text: `Entregado el ${fmtDate(m.actualDelivery)}; el plazo vence el ${fmtDate(mc?.acceptanceDeadline)}` }
                : { ok: false, text: 'Todavía no se entrega a pruebas' },
      ]
    }
    case 5: {
      const d08 = docSigned(d, 'D08')
      const d14 = docAny(d, 'D14')
      const toBill = r.budget.currentPrice
      return [
        d08 ? { ok: true, text: `D08 firmada el ${fmtDate(d08.signedOn)}` } : { ok: false, text: 'No hay D08 firmada' },
        { ok: r.billing.invoiced >= toBill && toBill > 0, text: `Facturado ${Math.round(r.billing.invoiced).toLocaleString('es-MX')} de ${Math.round(toBill).toLocaleString('es-MX')}` },
        d14 ? { ok: true, text: `D14 v${d14.version} registrada` } : { ok: false, text: 'No hay D14 registrada' },
      ]
    }
  }
}

export function gateRows(d: ProjectData, r: ControlResult): GateRow[] {
  const ms = [...d.milestones].sort((a, b) => {
    const sa = d.segments.find((s) => s.id === a.segmentId)?.position ?? 0
    const sb = d.segments.find((s) => s.id === b.segmentId)?.position ?? 0
    return sa - sb
  })
  const instances: { gate: GateNumber; milestone: Milestone | null }[] = [
    { gate: 1, milestone: null },
    { gate: 2, milestone: null },
    { gate: 3, milestone: null },
    ...ms.map((m) => ({ gate: 4 as GateNumber, milestone: m })),
    { gate: 5, milestone: null },
  ]
  return instances.map(({ gate, milestone }) => {
    const def = GATE_DEFS[gate]
    const record = d.gates.find((g) => g.gate === gate && (gate !== 4 || g.milestoneId === milestone?.id)) ?? null
    const checked = record ? record.checklist.filter((x) => Number(x) < def.items.length).length : 0
    const total = def.items.length
    const state: GateState = record?.approvedOn ? 'approved' : record?.requestedOn ? 'requested' : checked === total ? 'ready' : 'pending'
    return {
      gate,
      milestone,
      record,
      name: milestone ? `${def.name}: ${milestone.key}` : def.name,
      state,
      checked,
      total,
      hints: hintsFor(gate, d, r, milestone),
    }
  })
}

export const GATE_STATE_LABEL: Record<GateState, string> = {
  approved: 'Aprobada',
  requested: 'Pedida a Santiago',
  ready: 'Lista para pedir',
  pending: 'Faltan casillas',
}
