import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { approveGate1, createShare, notify } from '../../app/lifecycle'
import { useCan, useRepo, useSession } from '../../app/session'
import { useGlobal } from '../../app/useGlobal'
import { FOLLOW_UP_CHANNEL, PRESENTATION, options } from '../../domain/catalogs'
import { DEFAULT_MIN_MONTHLY, emptyGate1, emptySale, GATE1_ITEMS, latestProposal, monthlyAmount, suggestKey } from '../../domain/crm'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate, fmtMoney } from '../../domain/format'
import type { FollowUp, FollowUpChannel, SaleInfo } from '../../domain/types'
import { mailHtml, mailtoHref, sendMail } from '../../data/services'
import { Check, DateField, FormGrid, SelectField, TextArea, TextField } from '../../ui/fields'
import { Button, Card, Notice } from '../../ui/kit'
import { useTemplatesAndBase } from '../Proposal'
import { useSaver } from '../project/ctx'
import { LostDialog } from './ProspectPage'
import { newProposal, proposalDocData } from './proposalDoc'
import { SaveBar, useProspectDraft, type StepProps } from './StepsPreventa'
import { staffName, ValidationCard } from './Validation'

/** WhatsApp con el mensaje listo (números de 10 dígitos se toman de México). */
export function whatsappHref(phone: string | undefined, text: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.length < 10) return null
  return `https://wa.me/${digits.length === 10 ? `52${digits}` : digits}?text=${encodeURIComponent(text)}`
}

/* ------------------------------------------------------- 4. propuesta ---- */
export function ProposalStep({ crm, go }: StepProps) {
  const repo = useRepo()
  const navigate = useNavigate()
  const prospects = useGlobal('prospects')
  const tb = useTemplatesAndBase()
  const { d, setD, dirty } = useProspectDraft(crm)
  const saver = useSaver()
  const [sent, setSent] = useState<string | null>(null)
  const sale: SaleInfo = { ...emptySale(), ...(d.sale ?? {}) }
  const setSale = (patch: Partial<SaleInfo>) => setD((x) => ({ ...x, sale: { ...sale, ...patch } }))
  const pr = latestProposal(crm.proposals)
  const min = crm.firm.minMonthlyAmount ?? DEFAULT_MIN_MONTHLY
  const mm = monthlyAmount(pr?.price ?? null, pr?.units.weeks ?? null)
  const validated = Boolean(pr?.validation?.approvedOn)

  async function emailProposal() {
    if (!pr || !prospects.rows) return
    if (!d.contactEmail?.includes('@')) throw new Error('Falta el correo del contacto (paso 1).')
    const snapshot = proposalDocData({ proposal: pr, prospect: d, prospects: prospects.rows, proposals: crm.proposals, templates: tb.templates, base: tb.base, firm: crm.firm })
    const url = await createShare(repo, {
      projectId: null,
      documentId: null,
      proposalId: pr.id,
      code: 'D01',
      title: `Propuesta ${pr.variant} · ${d.company}`,
      snapshot,
      days: 30,
      meta: { version: pr.version, dateText: fmtDate(pr.date), fileName: `${d.projectKey || 'PROPUESTA'}-D01-propuesta-${pr.variant}-v${pr.version}`, firmName: crm.firm.name, projectName: pr.name, client: d.company, projectKey: d.projectKey || '' },
    })
    const text = `Hola ${d.contactName.split(' ')[0] || ''}:\n\nLe compartimos nuestra propuesta ${pr.variant} para ${pr.name}:\n${url}\n\nCon gusto la revisamos juntos; le escribo por WhatsApp para resolver dudas.\n\nSaludos,\n${crm.firm.name}`
    const r = await sendMail(repo, { to: [d.contactEmail], subject: `Propuesta · ${pr.name} · ${crm.firm.name}`, text, html: mailHtml(text) })
    await crm.saveProspect({ ...d, sale: { ...sale, presentation: 'email', presentedOn: sale.presentedOn ?? todayInMexico() } })
    setSent(r.via === 'server' ? 'Propuesta enviada por correo. Da seguimiento por WhatsApp.' : 'Se abrió tu correo con la liga a la propuesta.')
  }

  const wa = whatsappHref(d.contactPhone, `Hola ${d.contactName.split(' ')[0] || ''}, le escribo de ${crm.firm.name} para dar seguimiento a la propuesta que le enviamos. ¿Tiene alguna duda?`)

  return (
    <div className="space-y-4">
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {sent && <Notice tone="success">{sent}</Notice>}
      {!pr ? (
        <Card className="space-y-2 p-4">
          <p className="text-sm text-ink2">La propuesta preliminar sale de la estimación y lleva objetivo, problema, cómo lo logramos, resultado, pagos, cronograma, alcance, datos y confidencialidad, terceros y condiciones.</p>
          <Button variant="primary" onClick={() => void saver.run(async () => navigate(`/crm/${d.id}/propuesta/${(await crm.proposalsApi.save(newProposal(d, 1))).id}`))}>
            Hacer la propuesta
          </Button>
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="font-semibold">
                {pr.name} · {pr.variant} v{pr.version}
              </div>
              <div className="text-sm text-muted">
                {fmtMoney(pr.price)} · {pr.units.weeks} semanas · {mm.perMonth ? `${fmtMoney(mm.perMonth)} por mes` : ''} {mm.perMonth != null && mm.perMonth < min && <b className="text-rojo">bajo el mínimo</b>}
              </div>
            </div>
            <Link to={`/crm/${d.id}/propuesta/${pr.id}`} className="text-sm font-semibold text-accent">
              Abrir la propuesta
            </Link>
          </Card>
          <ValidationCard proposal={pr} prospect={d} save={(p) => crm.proposalsApi.save(p)} />
          <Card className="space-y-4 p-4">
            <h3 className="text-sm font-bold">Presentación</h3>
            {!validated && <Notice tone="warn">Se presenta cuando dirección general la valide.</Notice>}
            <FormGrid>
              <SelectField label="Cómo se presenta" value={sale.presentation} onChange={(v) => setSale({ presentation: v })} options={options(PRESENTATION)} />
              <DateField label="Fecha de la presentación" value={sale.presentationOn} onChange={(v) => setSale({ presentationOn: v })} />
              <DateField label="Se presentó el" value={sale.presentedOn} onChange={(v) => setSale({ presentedOn: v })} disabled={!validated} />
            </FormGrid>
            <SaveBar dirty={dirty} busy={saver.busy} onSave={() => void saver.run(() => crm.saveProspect(d)).then((ok) => ok && sale.presentedOn && go('segunda'))}>
              {sale.presentation === 'email' && (
                <Button disabled={!validated || dirty || saver.busy} onClick={() => void saver.run(emailProposal)}>
                  Mandar la propuesta por correo
                </Button>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className="rounded-lg border border-rule px-3 py-2 text-sm font-semibold text-ink2 hover:bg-soft">
                  Seguimiento por WhatsApp
                </a>
              )}
            </SaveBar>
          </Card>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------ 5. segunda entrevista ---- */
export function SecondStep({ crm, go }: StepProps) {
  const { d, setD, dirty } = useProspectDraft(crm)
  const saver = useSaver()
  const sale: SaleInfo = { ...emptySale(), ...(d.sale ?? {}) }
  const si = sale.secondInterview
  const setSi = (patch: Partial<SaleInfo['secondInterview']>) => setD((x) => ({ ...x, sale: { ...sale, secondInterview: { ...si, ...patch } } }))
  return (
    <Card className="space-y-4 p-4">
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      <p className="text-sm text-ink2">Si quien decide no estuvo en la presentación, se agenda una segunda entrevista para presentarle el proyecto, y se da seguimiento hasta tenerla.</p>
      <FormGrid>
        <SelectField
          label="¿Hace falta una segunda entrevista?"
          value={si.required == null ? null : si.required ? 'yes' : 'no'}
          onChange={(v) => setSi({ required: v == null ? null : v === 'yes', withWhom: si.withWhom || d.decisionMaker })}
          options={[
            { value: 'yes', label: 'Sí, con quien decide' },
            { value: 'no', label: 'No: quien decide ya la vio' },
          ]}
        />
        {si.required && <TextField label="Con quién" value={si.withWhom} onChange={(v) => setSi({ withWhom: v })} />}
        {si.required && <DateField label="Programada para" value={si.scheduledOn} onChange={(v) => setSi({ scheduledOn: v })} />}
        {si.required && <DateField label="Se tuvo el" value={si.heldOn} onChange={(v) => setSi({ heldOn: v })} />}
      </FormGrid>
      {si.required && <TextArea label="Lo que se acordó (si cambia algo, va a la propuesta y al acta de inicio)" rows={3} value={si.notes} onChange={(v) => setSi({ notes: v })} />}
      <SaveBar dirty={dirty} busy={saver.busy} onSave={() => void saver.run(() => crm.saveProspect(d)).then((ok) => ok && (si.required === false || si.heldOn) && go('seguimiento'))} />
    </Card>
  )
}

/* ------------------------------------------------------ 6. seguimiento ---- */
export function FollowStep({ crm, go }: StepProps) {
  const repo = useRepo()
  const can = useCan()
  const { session } = useSession()
  const tb = useTemplatesAndBase()
  const { d, setD } = useProspectDraft(crm)
  const saver = useSaver()
  const [losing, setLosing] = useState(false)
  const [entry, setEntry] = useState<FollowUp>({ id: localId('seg'), date: todayInMexico(), channel: 'whatsapp', note: '', nextOn: null })
  const sale: SaleInfo = { ...emptySale(), ...(d.sale ?? {}) }
  const gate = { ...emptyGate1(), ...(d.gate1 ?? {}) }
  const pr = latestProposal(crm.proposals)
  const [key, setKey] = useState(d.projectKey || suggestKey(d.company, pr?.name ?? ''))
  const follows = [...(d.followUps ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const wa = whatsappHref(d.contactPhone, `Hola ${d.contactName.split(' ')[0] || ''}, ¿cómo van con la propuesta? Quedo atento a sus comentarios.`)

  const addFollow = () =>
    void saver
      .run(() => crm.saveProspect({ ...d, followUps: [...(d.followUps ?? []), entry] }))
      .then((ok) => ok && setEntry({ id: localId('seg'), date: todayInMexico(), channel: entry.channel, note: '', nextOn: null }))

  const toggle = (i: number) => {
    const has = gate.checklist.includes(String(i))
    setD((x) => ({ ...x, gate1: { ...gate, checklist: has ? gate.checklist.filter((c) => c !== String(i)) : [...gate.checklist, String(i)] } }))
  }
  const ready = GATE1_ITEMS.every((_, i) => gate.checklist.includes(String(i))) && key.trim().length >= 2

  return (
    <div className="space-y-4">
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {d.stage === 'feasible' && sale.decision !== 'yes' && (
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-bold">Seguimientos</h3>
          <div className="flex flex-wrap gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className="rounded-lg border border-rule px-3 py-2 text-sm font-semibold text-ink2 hover:bg-soft">
                WhatsApp
              </a>
            )}
            {d.contactEmail && (
              <a href={mailtoHref({ to: [d.contactEmail], subject: `Seguimiento a la propuesta · ${crm.firm.name}`, text: `Hola ${d.contactName.split(' ')[0] || ''}:\n\n` })} className="rounded-lg border border-rule px-3 py-2 text-sm font-semibold text-ink2 hover:bg-soft">
                Correo
              </a>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-[9rem_10rem_minmax(0,1fr)_9rem]">
            <DateField label="Fecha" value={entry.date} onChange={(v) => setEntry((x) => ({ ...x, date: v ?? todayInMexico() }))} />
            <SelectField label="Canal" value={entry.channel} onChange={(v) => v && setEntry((x) => ({ ...x, channel: v as FollowUpChannel }))} options={options(FOLLOW_UP_CHANNEL)} allowEmpty={false} />
            <TextField label="Qué se habló" value={entry.note} onChange={(v) => setEntry((x) => ({ ...x, note: v }))} />
            <DateField label="Siguiente" value={entry.nextOn} onChange={(v) => setEntry((x) => ({ ...x, nextOn: v }))} />
          </div>
          <Button disabled={!entry.note.trim() || saver.busy} onClick={addFollow}>
            Registrar el seguimiento
          </Button>
          {follows.length > 0 && (
            <ul className="divide-y divide-rule rounded-lg border border-rule text-sm">
              {follows.map((x) => (
                <li key={x.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                  <span>
                    <b>{fmtDate(x.date)}</b> · {FOLLOW_UP_CHANNEL[x.channel]} · {x.note}
                  </span>
                  {x.nextOn && <span className="text-xs text-muted">Siguiente: {fmtDate(x.nextOn)}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 border-t border-rule pt-3">
            <Button variant="primary" disabled={saver.busy} onClick={() => void saver.run(() => crm.saveProspect({ ...d, sale: { ...sale, decision: 'yes', decidedOn: todayInMexico() } }))}>
              El cliente dijo que sí
            </Button>
            <Button variant="ghost" onClick={() => setLosing(true)}>
              El cliente dijo que no
            </Button>
          </div>
        </Card>
      )}

      {(sale.decision === 'yes' || d.stage === 'confirmed' || d.stage === 'client') && (
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-bold">Puerta 1 · Propuesta aceptada</h3>
          {gate.approvedOn ? (
            <p className="text-sm font-semibold text-accent-2">
              Aprobada por {gate.approvedBy || 'dirección general'} el {fmtDate(gate.approvedOn)}. Nació el expediente {d.projectKey}.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink2">Al aprobarla nace el expediente del proyecto con todos los datos del prospecto y su propuesta. Pasa a Operaciones cuando se cobre el pago inicial.</p>
              {GATE1_ITEMS.map((item, i) => (
                <Check key={i} checked={gate.checklist.includes(String(i))} onChange={() => toggle(i)} label={item} />
              ))}
              <TextField label="Clave del proyecto" help="Corta y única; va en los folios y en los nombres de archivo (por ejemplo, CE-INV)." value={key} onChange={(v) => setKey(v.toUpperCase())} />
              {!pr && <Notice tone="warn">Falta la propuesta.</Notice>}
              <div className="flex flex-wrap gap-2">
                {!gate.requestedOn && (
                  <Button
                    disabled={!ready || saver.busy}
                    onClick={() =>
                      void saver.run(async () => {
                        await crm.saveProspect({ ...d, projectKey: key.trim(), gate1: { ...gate, requestedOn: todayInMexico() } })
                        await notify(repo, { kind: 'gate', title: `Puerta 1 por aprobar: ${d.company}`, body: `Propuesta aceptada. Clave ${key.trim()}.`, link: `/crm/${d.id}?paso=seguimiento`, projectId: null, prospectId: d.id })
                      })
                    }
                  >
                    Pedir la puerta 1
                  </Button>
                )}
                {can.approveGates && pr && (
                  <Button
                    variant="primary"
                    disabled={!ready || saver.busy || !tb.ready}
                    onClick={() =>
                      void saver
                        .run(async () => {
                          const template = tb.templates.find((t) => t.id === pr.templateId) ?? tb.templates[0]
                          await approveGate1(repo, { prospect: { ...d, gate1: { ...gate, requestedOn: gate.requestedOn ?? todayInMexico() } }, proposal: pr, template, base: tb.base, firm: crm.firm, approvedBy: staffName(session), key: key.trim() })
                          await crm.reloadAll()
                        })
                        .then((ok) => ok && go('acta'))
                    }
                  >
                    Aprobar la puerta 1 y abrir el expediente
                  </Button>
                )}
              </div>
              {gate.requestedOn && !can.approveGates && <p className="text-xs text-muted">Pedida el {fmtDate(gate.requestedOn)}: la aprueba Santiago.</p>}
            </>
          )}
        </Card>
      )}
      {losing && <LostDialog crm={crm} step="seguimiento" close={() => setLosing(false)} />}
    </div>
  )
}
