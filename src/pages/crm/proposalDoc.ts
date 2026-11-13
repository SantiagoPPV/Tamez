import { STANDARD_TEMPLATE, ZERO_UNITS } from '../../domain/estimating'
import { projectFromProposal } from '../../domain/conversion'
import { emptyContent, emptyValidation } from '../../domain/crm'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import type { BaseHoursTable, DocData, FirmSettings, ProjectDocument, Proposal, Prospect, WbsTemplate } from '../../domain/types'
import { resolveDoc } from '../../docs/autofill'

/** Lo que llena la D01 de una propuesta (todavía sin proyecto). */
export function proposalDocData(input: {
  proposal: Proposal
  prospect: Prospect
  prospects: Prospect[]
  proposals: Proposal[]
  templates: WbsTemplate[]
  base: BaseHoursTable
  firm: FirmSettings
}): DocData {
  const { proposal, prospect } = input
  const template = input.templates.find((t) => t.id === proposal.templateId) ?? STANDARD_TEMPLATE
  const { data } = projectFromProposal({ proposal, prospect, template, base: input.base, key: prospect.projectKey || 'PROPUESTA' })
  data.project.name = proposal.name
  const doc: ProjectDocument = {
    id: localId('doc'),
    code: 'D01',
    version: proposal.version,
    status: 'draft',
    context: { proposalId: proposal.id, variant: proposal.variant },
    overrides: { fields: {}, lists: {} },
    snapshot: null,
    createdOn: proposal.date,
    sentOn: null,
    signedOn: null,
    notes: '',
  }
  return resolveDoc(doc, { data, firm: input.firm, proposals: [...input.proposals.filter((p) => p.id !== proposal.id), proposal], prospects: input.prospects })
}

export function newProposal(prospect: Prospect, version: number, previous?: Proposal | null): Proposal {
  if (previous) return { ...structuredClone(previous), id: localId('prop'), version, date: todayInMexico(), status: 'draft', validation: emptyValidation() }
  return {
    id: localId('prop'),
    prospectId: prospect.id,
    name: 'Sistema a la medida',
    variant: 'preliminar',
    version,
    date: todayInMexico(),
    validUntil: null,
    templateId: 'estandar-v1',
    size: 'medium',
    units: { ...ZERO_UNITS, weeks: 8, milestones: 2, invoices: 3, sites: 1, groups: 1, technicalRisks: 1, keyScreens: 3, followWeeks: 1 },
    rowOverrides: {},
    hourlyCost: 500,
    reservePct: 0.15,
    poolPct: 0.08,
    directCosts: 0,
    targetMargin: 0.16,
    price: null,
    payments: [],
    monthlyFee: null,
    monthlyPoolHours: 8,
    status: 'draft',
    notes: '',
    content: { ...emptyContent(), problem: prospect.problem },
    validation: emptyValidation(),
  }
}
