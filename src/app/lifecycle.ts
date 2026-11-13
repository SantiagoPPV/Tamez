/**
 * Lo que une el CRM con Operaciones:
 * - Puerta 1 aprobada → nace el expediente del proyecto («por arrancar», visible en el CRM).
 * - Pago inicial cobrado → el prospecto pasa a cliente, el proyecto aparece en Operaciones
 *   y se avisa a Operaciones (aviso en el sistema y, si hay correo configurado, por correo).
 * - Puertas 2 a 5 → la etapa del cliente avanza sola.
 */
import { PROJECT_STAGE } from '../domain/catalogs'
import { projectFromProspect } from '../domain/conversion'
import { todayInMexico } from '../domain/dates'
import { localId } from '../domain/factory'
import { stageAfterChange } from '../domain/stage'
import type { AppNotification, BaseHoursTable, DocData, DocumentCode, FirmSettings, ProjectData, ProjectStage, Proposal, Prospect, Signer, WbsTemplate } from '../domain/types'
import type { Repository } from '../data/repository'
import { integrations, mailHtml, sendMail } from '../data/services'

export async function notify(repo: Repository, n: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>): Promise<void> {
  await repo.saveGlobal('notifications', { ...n, id: localId('ntf'), createdAt: new Date().toISOString(), readBy: [] })
}

const emails = (text: string | undefined) => (text ?? '').split(/[,;\s]+/).filter((x) => x.includes('@'))

/** Puerta 1 aprobada por dirección general: nace el expediente con todos los datos del prospecto. */
export async function approveGate1(
  repo: Repository,
  input: { prospect: Prospect; proposal: Proposal; template: WbsTemplate; base: BaseHoursTable; firm: FirmSettings; approvedBy: string; key: string },
): Promise<string> {
  const today = todayInMexico()
  const all = await repo.loadAllProjects()
  const last = all[all.length - 1]
  const data = projectFromProspect({
    proposal: input.proposal,
    prospect: input.prospect,
    template: input.template,
    base: input.base,
    key: input.key,
    members: last?.members,
    hats: last?.hats,
    firm: input.firm,
    approvedOn: today,
    approvedBy: input.approvedBy,
  })
  const projectId = await repo.createProject(data)
  await repo.saveGlobal('prospects', {
    ...input.prospect,
    stage: 'confirmed',
    projectId,
    projectKey: input.key,
    gate1: { ...(input.prospect.gate1 ?? { checklist: [], requestedOn: today, approvedBy: '', approvedOn: null }), approvedOn: today, approvedBy: input.approvedBy },
  })
  await repo.saveGlobal('proposals', { ...input.proposal, status: 'accepted' })
  await notify(repo, {
    kind: 'gate',
    title: `Puerta 1 aprobada: ${input.prospect.company}`,
    body: `Nació el expediente ${input.key}: sigue el acta de inicio, la cita de cierre y el pago inicial.`,
    link: `/crm/${input.prospect.id}`,
    projectId,
    prospectId: input.prospect.id,
  })
  return projectId
}

/**
 * Revisa si la etapa del proyecto debe avanzar y, si avanza, la guarda y hace lo que toca.
 * Devuelve la etapa nueva (o null si no cambió).
 */
export async function syncProjectStage(repo: Repository, projectId: string, firm?: FirmSettings | null): Promise<{ from: ProjectStage | undefined; to: ProjectStage } | null> {
  const data = await repo.loadProject(projectId)
  const next = stageAfterChange(data)
  if (!next) return null
  const from = data.project.stage
  await repo.updateProject({ ...data.project, stage: next })
  if (from === 'confirmed' && next !== 'confirmed') await onClientBorn(repo, data, firm ?? (await repo.getFirm().catch(() => null)))
  else if (from && from !== next)
    await notify(repo, {
      kind: 'gate',
      title: `${data.project.key}: ${PROJECT_STAGE[next]}`,
      body: `Pasó de «${PROJECT_STAGE[from]}» a «${PROJECT_STAGE[next]}».`,
      link: `/p/${projectId}/proceso`,
      projectId,
      prospectId: data.project.prospectId ?? null,
    })
  return { from, to: next }
}

/** El pago inicial se cobró: el prospecto es cliente y Operaciones recibe el proyecto. */
async function onClientBorn(repo: Repository, data: ProjectData, firm: FirmSettings | null) {
  const p = data.project
  if (p.prospectId) {
    const prospect = await repo.getGlobal('prospects', p.prospectId)
    if (prospect && prospect.stage !== 'client') await repo.saveGlobal('prospects', { ...prospect, stage: 'client' })
  }
  await notify(repo, {
    kind: 'new_client',
    title: `Nuevo cliente: ${p.key} · ${p.client}`,
    body: 'Se cobró el pago inicial. El proyecto ya está en Operaciones, con el acta de inicio firmada, los involucrados y los accesos solicitados. Sigue la junta de arranque.',
    link: `/p/${p.id}/proceso`,
    projectId: p.id,
    prospectId: p.prospectId ?? null,
  })
  const to = emails(firm?.opsEmails)
  if (to.length && (await integrations(repo)).email) {
    const url = `${window.location.origin}/p/${p.id}/proceso`
    const text = `Nuevo cliente en Operaciones: ${p.key} · ${p.name || p.client}.\n\nSe cobró el pago inicial y el proyecto ya tiene sus datos: acta de inicio, involucrados, accesos solicitados y plan de pagos.\n\nSiguiente paso: la junta de arranque.\n\n${url}`
    await sendMail(repo, { to, subject: `Nuevo cliente: ${p.key} · ${p.client}`, text, html: mailHtml(text) }).catch(() => undefined)
  }
}

/* ------------------------------------------------------------- ligas ---- */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Crea una liga para ver un documento sin entrar al sistema (lleva lo congelado). */
export async function createShare(
  repo: Repository,
  input: {
    projectId: string | null
    documentId: string | null
    proposalId: string | null
    code: DocumentCode
    title: string
    snapshot: DocData
    signers?: Signer[]
    days?: number
    /** Lo que la página de la liga muestra arriba (versión, fecha, archivo, despacho) */
    meta?: { version: number; dateText: string; fileName: string; firmName: string; projectName?: string; client?: string; projectKey?: string }
  },
): Promise<string> {
  const token = newToken()
  const expires = new Date(Date.now() + (input.days ?? 60) * 86400000)
  if (input.meta) input = { ...input, snapshot: { ...input.snapshot, fields: { ...input.snapshot.fields, __meta: JSON.stringify(input.meta) } } }
  await repo.saveGlobal('shares', {
    id: localId('shr'),
    token,
    projectId: input.projectId,
    documentId: input.documentId,
    proposalId: input.proposalId,
    code: input.code,
    title: input.title,
    snapshot: input.snapshot,
    signers: input.signers ?? [],
    createdOn: todayInMexico(),
    expiresOn: expires.toISOString().slice(0, 10),
    revoked: false,
  })
  return `${window.location.origin}/compartido/${token}`
}
