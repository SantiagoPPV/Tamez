import { afterEach, describe, expect, it, vi } from 'vitest'
import { approveGate1, createShare, syncProjectStage } from '../app/lifecycle'
import { BASE_HOURS } from '../domain/catalogs'
import { STANDARD_TEMPLATE } from '../domain/estimating'
import { DemoRepository } from './demoRepo'
import { DEMO_FIRM } from './ceinv'

describe('CRM de punta a punta en la demostración', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('puerta 1, firma de las dos partes, liga y paso a cliente al cobrar', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://software.example' } })
    const repo = new DemoRepository()
    const prospects = await repo.listGlobal('prospects')
    expect(prospects).toHaveLength(6)
    const pros = prospects.find((p) => p.id === 'pros-4')!
    const proposal = (await repo.listGlobal('proposals')).find((p) => p.id === 'pr-4')!

    // Puerta 1: nace el expediente «por arrancar».
    const projectId = await approveGate1(repo, { prospect: pros, proposal, template: STANDARD_TEMPLATE, base: BASE_HOURS, firm: DEMO_FIRM, approvedBy: 'Santiago', key: 'DE-PED' })
    let data = await repo.loadProject(projectId)
    expect(data.project.stage).toBe('confirmed')
    expect((await repo.getGlobal('prospects', 'pros-4'))?.stage).toBe('confirmed')
    expect((await repo.listProjects()).find((p) => p.id === projectId)?.stage).toBe('confirmed')

    // Acta de inicio: se envía para firma y firman las dos partes.
    const acta = data.documents.find((d) => d.code === 'D02')!
    await expect(repo.signAsFirm(projectId, acta.id, acta.signers![1].id, 'Santiago', null)).rejects.toThrow(/no se envía/)
    await repo.save(projectId, 'documents', { ...acta, status: 'sent', sentOn: '2027-02-21', snapshot: { fields: { 'proyecto.nombre': 'Pedidos' }, lists: {} } })
    await expect(repo.portalSign(projectId, acta.id, acta.signers![1].id, 'Alguien', null)).rejects.toThrow(/no firma por el cliente/)
    await repo.portalSign(projectId, acta.id, acta.signers![0].id, 'Persona de ejemplo', 'data:image/png;base64,AAA')
    const firm = await repo.signAsFirm(projectId, acta.id, acta.signers![1].id, 'Santiago Pérez', null)
    expect(firm.documentHash).toMatch(/^[0-9a-f]{64}$/)
    data = await repo.loadProject(projectId)
    expect(data.documents.find((d) => d.id === acta.id)?.status).toBe('signed')
    expect(data.signatures).toHaveLength(2)
    expect(data.signatures[0].documentHash).toBe(data.signatures[1].documentHash)
    await expect(repo.save(projectId, 'signatures', data.signatures[0])).rejects.toThrow()

    // Liga para varios correos: abre sin sesión, con sus firmas.
    const url = await createShare(repo, { projectId, documentId: acta.id, proposalId: null, code: 'D02', title: 'Acta de inicio', snapshot: { fields: {}, lists: {} }, signers: acta.signers, meta: { version: 1, dateText: '', fileName: 'DE-PED-D02', firmName: 'Sistemas a la medida' } })
    const token = url.split('/compartido/')[1]
    const shared = await repo.sharedDocument(token)
    expect(shared?.signatures).toHaveLength(2)
    expect(JSON.parse(shared!.snapshot.fields.__meta).fileName).toBe('DE-PED-D02')
    expect(await repo.sharedDocument('no-existe')).toBeNull()

    // Cobro del pago inicial: pasa a cliente y Operaciones recibe el proyecto.
    const inv = data.invoices.find((i) => i.concept === 'initial')!
    await repo.save(projectId, 'invoices', { ...inv, invoiceDate: '2027-02-22', paidDate: '2027-02-24' })
    const moved = await syncProjectStage(repo, projectId, DEMO_FIRM)
    expect(moved).toEqual({ from: 'confirmed', to: 'start' })
    expect((await repo.getGlobal('prospects', 'pros-4'))?.stage).toBe('client')
    const avisos = await repo.listGlobal('notifications')
    expect(avisos.map((n) => n.kind)).toEqual(expect.arrayContaining(['gate', 'signature', 'new_client']))
    expect(avisos[0].kind).toBe('new_client')
    expect(await syncProjectStage(repo, projectId, DEMO_FIRM)).toBeNull()
  })

  it('el portal da al cliente los documentos y archivos compartidos, sin lo interno', async () => {
    const repo = new DemoRepository()
    const blob = new Blob(['PDF'], { type: 'application/pdf' })
    await repo.uploadFile({ projectId: 'ce-inv', prospectId: null, kind: 'acta', clientVisible: true, notes: '', name: 'acta.pdf' }, blob)
    await repo.uploadFile({ projectId: 'ce-inv', prospectId: null, kind: 'other', clientVisible: false, notes: '', name: 'interno.pdf' }, blob)
    const pd = await repo.portalData('ce-inv')
    expect(pd.files.map((f) => f.name)).toEqual(['acta.pdf'])
    expect(pd.data.documents.every((d) => d.code !== 'D11' && d.code !== 'D16')).toBe(true)
    expect(pd.me.roleKey).toBe('decides')
  })
})
