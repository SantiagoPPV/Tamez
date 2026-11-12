import { QUALITY_LISTS, STANDARD_ROUTINES } from '../domain/catalogs'
import { DEFAULT_PARAMS } from '../domain/defaults'
import { CEINV_UNITS } from '../domain/estimating'
import type { ClientRole, FirmSettings, ProjectData, ProjectDocument, Proposal, Prospect } from '../domain/types'
import { CEINV_CONTACT_DETAILS, CEINV_CRITERIA, CEINV_FACTS, CEINV_SEGMENT_TEXT } from './ceinv.extra'
import { CEINV_PARAMS, CEINV_RAW } from './ceinv.raw'

const ROLE_KEY: Record<string, ClientRole> = {
  'Decide y paga': 'decides',
  'Responsable del proyecto': 'responsible',
  'Tramita órdenes y pagos': 'billing',
}

const doc = (
  id: string,
  code: ProjectDocument['code'],
  status: ProjectDocument['status'],
  date: string,
  context: ProjectDocument['context'] = {},
): ProjectDocument => ({
  id,
  code,
  version: 1,
  status,
  context,
  overrides: { fields: {}, lists: {} },
  snapshot: null,
  createdOn: date,
  sentOn: status === 'draft' ? null : date,
  signedOn: status === 'signed' ? date : null,
  notes: '',
})

/**
 * Caso ficticio CE-INV («Control de inventario en almacenes», Cliente Ejemplo, S.A. de C.V.)
 * al corte del viernes 12/02/2027. Cada llamada devuelve una copia nueva.
 */
export function buildCeInv(): ProjectData {
  const raw = structuredClone(CEINV_RAW)
  const segmentText = (name: string) => CEINV_SEGMENT_TEXT[name === 'Hasta la puerta 3' ? 'Diagnóstico' : name]
  return {
    ...raw,
    project: {
      ...raw.project,
      params: {
        ...DEFAULT_PARAMS,
        ...CEINV_PARAMS,
        // Mensualidad del caso: 12,000 pesos más IVA desde el jueves 8 de abril de 2027 (Procedimientos, 5).
        monthlyFee: 12000,
        serviceStart: '2027-04-08',
        monthlyPoolHours: 8,
        expectedMargin: 53500 / 330000,
      },
      facts: structuredClone(CEINV_FACTS),
    },
    segments: raw.segments.map((s) => ({ ...s, ...(segmentText(s.name) ?? {}) })),
    milestones: raw.milestones.map((m) => {
      const t = CEINV_SEGMENT_TEXT[`Hito ${m.key.slice(1)}`]
      return { ...m, result: t?.result ?? '', criterion: t?.criterion ?? '' }
    }),
    members: raw.members.map((m) => ({ ...m, ...pick(CEINV_CONTACT_DETAILS[m.name]) })),
    contacts: raw.contacts.map((c) => ({
      ...c,
      roleKey: ROLE_KEY[c.role] ?? (c.role.startsWith('Contacto de sistemas') ? 'systems' : 'other'),
      ...pick(CEINV_CONTACT_DETAILS[c.name]),
    })),
    wbs: raw.wbs.map((w) => ({
      ...w,
      // Las actividades con lista completa traen palomeadas todas las casillas de su tipo.
      checklist: w.checklistComplete && w.activityType ? QUALITY_LISTS[w.activityType].items.map((_, i) => String(i)) : [],
    })),
    gates: [
      { id: 'g-1', gate: 1, milestoneId: null, checklist: ['0', '1'], requestedOn: '2027-01-04', approvedById: 'm-santiago', approvedOn: '2027-01-04', notes: 'Aceptación por correo de Ricardo Solís.' },
      { id: 'g-2', gate: 2, milestoneId: null, checklist: ['0', '1', '2', '3'], requestedOn: '2027-01-08', approvedById: 'm-santiago', approvedOn: '2027-01-08', notes: 'Orden de compra OC-2027-0018.' },
      { id: 'g-3', gate: 3, milestoneId: null, checklist: ['0', '1'], requestedOn: '2027-01-22', approvedById: 'm-santiago', approvedOn: '2027-01-22', notes: 'D03 v1 y D11 v1, 420 horas (DE-04).' },
    ],
    criteria: structuredClone(CEINV_CRITERIA),
    documents: [
      doc('doc-d01p', 'D01', 'signed', '2027-01-04', { variant: 'preliminar', proposalId: 'pr-ceinv' }),
      doc('doc-d10', 'D10', 'sent', '2027-01-04'),
      doc('doc-d02', 'D02', 'signed', '2027-01-07'),
      doc('doc-d03', 'D03', 'signed', '2027-01-22'),
      doc('doc-d12', 'D12', 'sent', '2027-01-22'),
      doc('doc-d04h1', 'D04', 'signed', '2027-01-25', { milestoneId: 'ms-h1' }),
      doc('doc-d06s5', 'D06', 'sent', '2027-02-12', { cutoff: '2027-02-12', week: 5 }),
    ],
    routines: STANDARD_ROUTINES.map((r, i) => ({ id: `rut-${i + 1}`, ...r, ownerId: 'm-santiago', active: true })),
    routineRuns: [],
    portalAccess: [],
  }
}

function pick(d?: { position: string; email: string; phone: string }) {
  return d ? { position: d.position, email: d.email.includes('@') ? d.email : '', phone: d.phone } : {}
}

/* ---------------------------------------------------------------------------
 * Preventa y despacho en la demostración (fuera de un proyecto)
 * ------------------------------------------------------------------------- */
export function buildDemoProspects(): Prospect[] {
  return [
    {
      id: 'pros-ceinv',
      company: 'Cliente Ejemplo, S.A. de C.V.',
      contactName: 'Ricardo Solís',
      contactRole: 'Director general',
      source: 'Recomendación',
      stage: 'won',
      problem: '«Contamos a mano cada semana y aun así no sabemos cuánto hay en cada almacén.»',
      budget: 'Hasta 350,000 pesos',
      decisionMaker: 'Ricardo Solís, director general',
      decisionDate: '2027-01-04',
      nextStep: 'Proyecto CE-INV en ejecución',
      nextStepDate: null,
      lostReason: '',
      projectId: 'ce-inv',
      createdOn: '2026-12-01',
      notes: 'Caso ficticio de ejemplo.',
    },
    {
      id: 'pros-2',
      company: 'Prospecto Ejemplo Norte (ficticio)',
      contactName: 'Persona de ejemplo',
      contactRole: 'Gerente de operaciones',
      source: 'Evento',
      stage: 'feasibility',
      problem: '«Las órdenes de servicio viven en hojas de cálculo y nadie sabe qué técnico va a dónde.»',
      budget: 'Por definir',
      decisionMaker: 'Dirección general',
      decisionDate: null,
      nextStep: 'Revisión interna de factibilidad (D11 v0)',
      nextStepDate: '2027-02-17',
      lostReason: '',
      projectId: null,
      createdOn: '2027-02-08',
      notes: 'Dato ficticio para la demostración.',
    },
    {
      id: 'pros-3',
      company: 'Prospecto Ejemplo Sur (ficticio)',
      contactName: 'Persona de ejemplo',
      contactRole: 'Contraloría',
      source: 'Sitio web',
      stage: 'qualify',
      problem: '«Conciliamos a mano las compras de tres sucursales.»',
      budget: 'Por definir',
      decisionMaker: 'Por confirmar',
      decisionDate: null,
      nextStep: 'Primera plática',
      nextStepDate: '2027-02-15',
      lostReason: '',
      projectId: null,
      createdOn: '2027-02-10',
      notes: 'Dato ficticio para la demostración.',
    },
  ]
}

export function buildDemoProposals(): Proposal[] {
  return [
    {
      id: 'pr-ceinv',
      prospectId: 'pros-ceinv',
      name: 'Control de inventario en almacenes',
      variant: 'definitiva',
      version: 1,
      date: '2027-01-22',
      validUntil: '2027-02-06',
      templateId: 'estandar-v1',
      size: 'medium',
      units: { ...CEINV_UNITS },
      rowOverrides: {},
      hourlyCost: 500,
      reservePct: 0.15,
      poolPct: 0.08,
      directCosts: 18000,
      targetMargin: 0.16,
      price: 330000,
      payments: [
        { label: 'Pago inicial', trigger: 'Al firmar el acta de inicio', amount: 40000 },
        { label: 'Hito 1', trigger: 'Al aceptar el Hito 1', amount: 90000 },
        { label: 'Hito 2', trigger: 'Al aceptar el Hito 2', amount: 90000 },
        { label: 'Hito 3', trigger: 'Al aceptar el Hito 3', amount: 110000 },
      ],
      monthlyFee: 12000,
      monthlyPoolHours: 8,
      status: 'accepted',
      notes: 'Precio del caso; el margen resultante es 16.2 %.',
    },
  ]
}

export const DEMO_FIRM: FirmSettings = {
  id: 'firm',
  name: 'Sistemas a la medida',
  salesEmail: 'cuenta@sistemasalamedida.mx',
  salesPhone: '55 5550 0111',
  contactEmail: 'socio@sistemasalamedida.mx',
  contactPhone: '55 5550 0110',
  supportEmail: 'soporte@sistemasalamedida.mx',
  supportPhone: '55 5550 0112',
}
