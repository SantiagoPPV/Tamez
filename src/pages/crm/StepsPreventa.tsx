import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useRepo, useSession } from '../../app/session'
import { useGlobal } from '../../app/useGlobal'
import { ANSWER3, PROJECT_SIZE } from '../../domain/catalogs'
import {
  COMPANY_SIZE,
  DEFAULT_MIN_MONTHLY,
  companySize,
  emptyDiscovery,
  emptyFeasibility,
  feasibilityCheck,
  latestProposal,
  meetsMinimum,
  monthlyAmount,
  projectSizeByUsers,
  stepDone,
} from '../../domain/crm'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate, fmtMoney, fmtPct } from '../../domain/format'
import { formatQuestions, getFormat } from '../../domain/formats'
import { estimate, STANDARD_TEMPLATE } from '../../domain/estimating'
import type { AiJob, Answer3, CrmStep, DiscoveryAi, Prospect } from '../../domain/types'
import { integrations, mailHtml, sendMail, ServiceError, startDiscoverySummary } from '../../data/services'
import { DateField, DateTimeField, FormGrid, NumberField, SelectField, TextArea, TextField } from '../../ui/fields'
import { Button, Card, cx, Notice } from '../../ui/kit'
import { useTemplatesAndBase } from '../Proposal'
import { useSaver } from '../project/ctx'
import { LostDialog } from './ProspectPage'
import { newProposal } from './proposalDoc'
import type { Crm } from './useCrm'
import { staffName } from './Validation'
import { openStoredFile } from '../../ui/openFile'

export interface StepProps {
  crm: Crm
  go: (s: CrmStep) => void
}

/** Copia editable del prospecto mientras se trabaja el paso. */
export function useProspectDraft(crm: Crm) {
  const [d, setD] = useState<Prospect>(crm.prospect!)
  const original = crm.prospect!
  useEffect(() => setD(crm.prospect!), [crm.prospect])
  const set = <K extends keyof Prospect>(k: K, v: Prospect[K]) => setD((x) => ({ ...x, [k]: v }))
  const dirty = JSON.stringify(d) !== JSON.stringify(original)
  return { d, setD, set, dirty }
}

export function SaveBar({ dirty, busy, onSave, children }: { dirty: boolean; busy: boolean; onSave: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" disabled={!dirty || busy} onClick={onSave}>
        {busy ? 'Guardando…' : 'Guardar'}
      </Button>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------ 1. alta ---- */
export function AltaStep({ crm, go }: StepProps) {
  const { d, setD, set, dirty } = useProspectDraft(crm)
  const saver = useSaver()
  const disc = d.discovery ?? emptyDiscovery()
  const size = companySize(d.companyEmployees, crm.firm.companySizes)
  const suggested = projectSizeByUsers(d.projectUsers)
  const save = () =>
    void saver.run(async () => {
      const saved = await crm.saveProspect(d)
      if (stepDone('alta', { prospect: saved, proposals: crm.proposals })) go('descubrimiento')
    })
  return (
    <Card className="space-y-4 p-4">
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      <FormGrid>
        <TextField label="Empresa" value={d.company} onChange={(v) => set('company', v)} />
        <TextField label="Giro" value={d.industry ?? ''} onChange={(v) => set('industry', v)} />
        <TextField label="Contacto" value={d.contactName} onChange={(v) => set('contactName', v)} />
        <TextField label="Puesto" value={d.contactRole} onChange={(v) => set('contactRole', v)} />
        <TextField label="Correo" value={d.contactEmail ?? ''} onChange={(v) => set('contactEmail', v.trim())} />
        <TextField label="Teléfono o WhatsApp" value={d.contactPhone ?? ''} onChange={(v) => set('contactPhone', v)} />
        <TextField label="De dónde llegó" value={d.source} onChange={(v) => set('source', v)} />
        <DateField label="Fecha de alta" value={d.createdOn} onChange={(v) => v && set('createdOn', v)} />
        <NumberField label="Empleados de la empresa" help={size ? `Tamaño de la empresa: ${COMPANY_SIZE[size]}` : 'Define el tamaño de la empresa.'} value={d.companyEmployees ?? null} onChange={(v) => set('companyEmployees', v)} />
        <NumberField
          label="Empleados que usarían el sistema"
          help={suggested ? `Proyecto ${PROJECT_SIZE[suggested].label.toLowerCase()} (${PROJECT_SIZE[suggested].weeks} semanas aprox.)` : 'Define el tamaño del proyecto.'}
          value={d.projectUsers ?? null}
          onChange={(v) => set('projectUsers', v)}
        />
        <DateTimeField label="Junta de descubrimiento programada" value={disc.scheduledAt} onChange={(v) => setD((x) => ({ ...x, discovery: { ...disc, scheduledAt: v } }))} />
        <TextField label="Presupuesto que mencionó" value={d.budget} onChange={(v) => set('budget', v)} />
      </FormGrid>
      <TextArea label="Notas" rows={2} value={d.notes} onChange={(v) => set('notes', v)} />
      <SaveBar dirty={dirty} busy={saver.busy} onSave={save} />
    </Card>
  )
}

/* ---------------------------------------------------- 2. descubrimiento ---- */
export function DiscoveryStep({ crm, go }: StepProps) {
  const repo = useRepo()
  const files = useGlobal('files')
  const { d, setD, set, dirty } = useProspectDraft(crm)
  const saver = useSaver()
  const [ai, setAi] = useState<{ ready: boolean; job: AiJob | null; error: string | null }>({ ready: false, job: null, error: null })
  const timer = useRef<number | null>(null)
  const disc = d.discovery ?? emptyDiscovery()
  const def = getFormat(crm.firm, 'D15')
  const setDisc = (patch: Partial<typeof disc>) => setD((x) => ({ ...x, discovery: { ...disc, ...patch } }))
  const setAnswer = (id: string, v: string) => setDisc({ answers: { ...disc.answers, [id]: v } })
  const audios = (files.rows ?? []).filter((f) => f.prospectId === d.id && f.kind === 'audio')

  const poll = useCallback(
    (id: string, since: number) => {
      if (timer.current) window.clearInterval(timer.current)
      const stop = (error: string | null) => {
        window.clearInterval(timer.current!)
        timer.current = null
        if (error) setAi((x) => ({ ...x, error }))
      }
      timer.current = window.setInterval(async () => {
        const job = await repo.getGlobal('aiJobs', id).catch(() => null)
        if (job) setAi((x) => ({ ...x, job }))
        const waited = Date.now() - since
        if (job?.status === 'done' || job?.status === 'error') stop(null)
        else if (job?.status === 'queued' && waited > 90_000)
          stop('El resumen no arrancó en el servidor: revisa que la función resumen-background esté publicada en Netlify y que ANTHROPIC_API_KEY esté guardada.')
        else if (waited > 16 * 60_000) stop('El resumen no terminó en 15 minutos. Intenta de nuevo; si se repite, divide la transcripción.')
      }, 4000)
    },
    [repo],
  )

  useEffect(() => {
    void integrations(repo).then((i) => setAi((x) => ({ ...x, ready: i.ai })))
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [repo])

  // Al volver al paso se recupera el último resumen: el terminado se muestra y el que sigue en curso se sigue consultando.
  const lastJobId = crm.prospect?.discovery?.aiJobId ?? null
  useEffect(() => {
    if (!lastJobId) return
    let alive = true
    void repo.getGlobal('aiJobs', lastJobId).then((job) => {
      if (!alive || !job) return
      setAi((x) => (x.job ? x : { ...x, job }))
      if (job.status === 'queued' || job.status === 'running') poll(job.id, Date.parse(job.createdAt) || Date.now())
    })
    return () => {
      alive = false
    }
  }, [repo, lastJobId, poll])

  async function summarize() {
    setAi((x) => ({ ...x, error: null, job: null }))
    const job: AiJob = {
      id: localId('job'),
      kind: 'discovery_summary',
      prospectId: d.id,
      input: { company: d.company, contact: [d.contactName, d.contactRole].filter(Boolean).join(', '), questions: formatQuestions(def).map((q) => ({ id: q.id, label: q.label })), transcript: disc.transcript },
      status: 'queued',
      result: null,
      error: '',
      createdAt: new Date().toISOString(),
      finishedAt: null,
    }
    const saved = await repo.saveGlobal('aiJobs', job)
    await crm.saveProspect({ ...d, discovery: { ...disc, aiJobId: saved.id } })
    setAi((x) => ({ ...x, job: saved }))
    await startDiscoverySummary(repo, saved.id)
    poll(saved.id, Date.now())
  }

  const apply = (r: DiscoveryAi) =>
    setD((x) => {
      const answers = { ...disc.answers }
      for (const a of r.respuestas) if (a.respuesta && !answers[a.id]?.trim()) answers[a.id] = a.respuesta
      if (r.problema && !answers.problema) answers.problema = r.problema
      return {
        ...x,
        problem: x.problem.trim() ? x.problem : r.problema,
        decisionMaker: x.decisionMaker.trim() ? x.decisionMaker : r.quien_decide.nombre,
        decisionMakerRole: x.decisionMakerRole?.trim() ? x.decisionMakerRole : r.quien_decide.puesto,
        budget: x.budget.trim() ? x.budget : r.presupuesto,
        discovery: { ...disc, summary: disc.summary.trim() ? disc.summary : r.resumen, answers },
      }
    })

  async function sendSummary() {
    if (!d.contactEmail?.includes('@')) throw new ServiceError('Falta el correo del contacto (paso 1).', 'correo')
    const qs = formatQuestions(def).filter((q) => disc.answers[q.id]?.trim())
    const text = [
      `Hola ${d.contactName.split(' ')[0] || ''}:`,
      '',
      `Gracias por la junta${disc.heldOn ? ` del ${fmtDate(disc.heldOn)}` : ''}. Este es el resumen de lo que entendimos; por favor corríjanos lo que no sea exacto en los próximos 2 días hábiles.`,
      '',
      disc.summary,
      '',
      ...qs.map((q) => `${q.label}\n${disc.answers[q.id]}\n`),
      `Saludos,`,
      crm.firm.name,
    ].join('\n')
    await sendMail(repo, { to: [d.contactEmail], subject: `Resumen de la junta de descubrimiento · ${d.company}`, text, html: mailHtml(text) })
    await crm.saveProspect({ ...d, discovery: { ...disc, sentOn: todayInMexico() } })
  }

  const save = () =>
    void saver.run(async () => {
      const saved = await crm.saveProspect(d)
      if (stepDone('descubrimiento', { prospect: saved, proposals: crm.proposals })) go('factibilidad')
    })
  const result = ai.job?.status === 'done' ? ai.job.result : null

  return (
    <div className="space-y-4">
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      <Card className="space-y-4 p-4">
        <FormGrid>
          <DateTimeField label="Programada" value={disc.scheduledAt} onChange={(v) => setDisc({ scheduledAt: v })} />
          <DateField label="Fecha en que se tuvo" value={disc.heldOn} onChange={(v) => setDisc({ heldOn: v })} />
        </FormGrid>
        <div>
          <div className="mb-1 text-sm font-semibold text-ink2">Grabación de la sesión (audio)</div>
          <div className="flex flex-wrap items-center gap-2">
            <TextField className="min-w-0 flex-1" label="" value={disc.recordingUrl} onChange={(v) => setDisc({ recordingUrl: v.trim() })} placeholder="Liga a la grabación (Drive, Meet, Zoom…)" />
            <label className="cursor-pointer rounded-lg border border-rule px-3 py-2 text-sm font-semibold text-ink2 hover:bg-soft">
              Subir audio
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void saver.run(async () => {
                    await repo.uploadFile({ projectId: null, prospectId: d.id, kind: 'audio', clientVisible: false, notes: 'Junta de descubrimiento' }, f)
                    await files.reload()
                  })
                }}
              />
            </label>
          </div>
          {audios.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {audios.map((f) => (
                <li key={f.id}>
                  <button type="button" className="font-semibold text-accent" onClick={() => void saver.run(() => openStoredFile(repo, f))}>
                    {f.name}
                  </button>{' '}
                  <span className="text-xs text-muted">{(f.size / 1_048_576).toFixed(1)} MB</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-bold">Resumen con IA</h3>
        <p className="text-sm text-ink2">
          Pega la transcripción de la grabación (Meet, Zoom, Teams o las notas de voz del celular la generan). Claude llena el resumen, el problema, quién decide y las
          preguntas base; tú lo revisas antes de guardar.
        </p>
        <TextArea label="Transcripción" rows={6} value={disc.transcript} onChange={(v) => setDisc({ transcript: v })} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={!ai.ready || disc.transcript.trim().length < 200 || saver.busy || ai.job?.status === 'queued' || ai.job?.status === 'running'}
            onClick={() => void saver.run(summarize)}
          >
            {ai.job?.status === 'queued' || ai.job?.status === 'running' ? 'Resumiendo…' : 'Resumir con Claude'}
          </Button>
          {!ai.ready && <span className="text-xs text-muted">{repo.mode === 'demo' ? 'En la demostración no hay IA: escribe el resumen.' : 'Se activa al guardar ANTHROPIC_API_KEY en Netlify.'}</span>}
          {disc.transcript.trim().length > 0 && disc.transcript.trim().length < 200 && <span className="text-xs text-muted">La transcripción es muy corta.</span>}
        </div>
        {ai.error && <Notice tone="error">{ai.error}</Notice>}
        {ai.job?.status === 'error' && <Notice tone="error">{ai.job.error}</Notice>}
        {result && (
          <div className="space-y-2 rounded-lg bg-accent-soft/50 p-3 text-sm">
            <div className="font-semibold text-accent-2">Propuesta de Claude</div>
            <p>{result.resumen}</p>
            {result.problema && <p><b>Problema:</b> {result.problema}</p>}
            {result.quien_decide.nombre && <p><b>Quién decide:</b> {[result.quien_decide.nombre, result.quien_decide.puesto].filter(Boolean).join(', ')}</p>}
            {result.riesgos.length > 0 && <p><b>Riesgos:</b> {result.riesgos.join('; ')}</p>}
            {result.siguientes_pasos.length > 0 && <p><b>Siguientes pasos:</b> {result.siguientes_pasos.join('; ')}</p>}
            <Button size="sm" variant="primary" onClick={() => apply(result)}>
              Usarlo para llenar lo vacío
            </Button>
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-4">
        <TextArea label="Resumen de la junta" rows={5} value={disc.summary} onChange={(v) => setDisc({ summary: v })} />
        <TextArea label="El problema, en sus palabras" rows={2} value={d.problem} onChange={(v) => set('problem', v)} />
        <FormGrid>
          <TextField label="Quién decide" value={d.decisionMaker} onChange={(v) => set('decisionMaker', v)} />
          <TextField label="Su puesto" value={d.decisionMakerRole ?? ''} onChange={(v) => set('decisionMakerRole', v)} />
        </FormGrid>
      </Card>

      <Card className="space-y-4 p-4">
        <div>
          <h3 className="text-sm font-bold">Preguntas base</h3>
          <p className="text-xs text-muted">Las mismas en todos los proyectos. Se editan en Despacho.</p>
        </div>
        {def.sections.map((s) => (
          <details key={s.id} className="rounded-lg border border-rule p-3" open={s.questions.some((q) => q.required)}>
            <summary className="cursor-pointer text-sm font-semibold">
              {s.title}{' '}
              <span className="text-xs font-normal text-muted">
                ({s.questions.filter((q) => disc.answers[q.id]?.trim()).length}/{s.questions.length})
              </span>
            </summary>
            <div className="mt-3 space-y-3">
              {s.questions.map((q) => (
                <TextArea key={q.id} label={`${q.label}${q.required ? ' *' : ''}`} rows={q.kind === 'long' ? 2 : 1} value={disc.answers[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
              ))}
            </div>
          </details>
        ))}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <SaveBar dirty={dirty} busy={saver.busy} onSave={save}>
          <Button disabled={!disc.summary.trim() || dirty || saver.busy} onClick={() => void saver.run(sendSummary)}>
            Enviar el resumen al prospecto
          </Button>
          {disc.sentOn && <span className="text-xs text-muted">Enviado el {fmtDate(disc.sentOn)}</span>}
        </SaveBar>
      </div>
    </div>
  )
}

/* ------------------------------------------------------ 3. factibilidad ---- */
export function FeasibilityStep({ crm, go }: StepProps) {
  const { d, setD, dirty } = useProspectDraft(crm)
  const { session } = useSession()
  const navigate = useNavigate()
  const tb = useTemplatesAndBase()
  const saver = useSaver()
  const [losing, setLosing] = useState(false)
  const f = d.feasibility ?? emptyFeasibility()
  const def = getFormat(crm.firm, 'D16')
  const pr = latestProposal(crm.proposals)
  const est = pr
    ? estimate({ template: tb.templates.find((t) => t.id === pr.templateId) ?? STANDARD_TEMPLATE, units: pr.units, size: pr.size, base: tb.base, hourlyCost: pr.hourlyCost, reservePct: pr.reservePct, poolPct: pr.poolPct, directCosts: pr.directCosts, targetMargin: pr.targetMargin, rowOverrides: pr.rowOverrides, price: pr.price })
    : null
  const min = crm.firm.minMonthlyAmount ?? DEFAULT_MIN_MONTHLY
  const mm = monthlyAmount(est?.price ?? null, pr?.units.weeks ?? null)
  const meets = meetsMinimum(est?.price ?? null, pr?.units.weeks ?? null, min)
  const setAnswer = (id: string, patch: Partial<{ value: Answer3 | null; note: string }>) =>
    setD((x) => ({ ...x, feasibility: { ...f, answers: { ...f.answers, [id]: { value: f.answers[id]?.value ?? null, note: f.answers[id]?.note ?? '', ...patch } } } }))
  // El mínimo mensual sale de la estimación.
  const withAuto = () => (meets == null ? f : { ...f, answers: { ...f.answers, minimo: { value: meets ? ('yes' as const) : ('no' as const), note: mm.perMonth ? `${fmtMoney(mm.perMonth)} por mes (${mm.months} meses) contra ${fmtMoney(min)}` : '' } } })
  const check = feasibilityCheck(withAuto(), crm.firm)

  async function startEstimate() {
    const saved = await crm.proposalsApi.save(newProposal(d, 1))
    navigate(`/crm/${d.id}/propuesta/${saved.id}`)
  }

  return (
    <div className="space-y-4">
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-bold">Estimación v0</h3>
        {!pr || !est ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-ink2">Se estima de abajo hacia arriba con el desglose estándar: unidades, horas, costo y precio con margen.</p>
            <Button variant="primary" disabled={saver.busy} onClick={() => void saver.run(startEstimate)}>
              Hacer la estimación v0
            </Button>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted">Horas</dt>
                <dd className="num font-semibold">{Math.round(est.budgetedHours)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Precio</dt>
                <dd className="num font-semibold">{fmtMoney(est.price)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Margen</dt>
                <dd className="num font-semibold">{fmtPct(est.marginPct)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Por mes de creación</dt>
                <dd className={cx('num font-semibold', meets === false ? 'text-rojo' : 'text-accent-2')}>{mm.perMonth == null ? '—' : fmtMoney(mm.perMonth)}</dd>
              </div>
            </dl>
            <p className={cx('text-sm', meets === false ? 'font-semibold text-rojo' : 'text-ink2')}>
              Mínimo de venta: {fmtMoney(min)} por mes de creación ({pr.units.weeks} semanas ≈ {mm.months} meses).{' '}
              {meets === false ? 'No se cumple: sube el alcance o el precio, o márcalo como no factible.' : meets ? 'Se cumple.' : ''}
            </p>
            <Link to={`/crm/${d.id}/propuesta/${pr.id}`} className="text-sm font-semibold text-accent">
              Abrir la estimación
            </Link>
          </>
        )}
      </Card>

      <Card className="space-y-4 p-4">
        <div>
          <h3 className="text-sm font-bold">Revisión interna: ¿podemos, nos conviene y es rentable?</h3>
          <p className="text-xs text-muted">{def.intro} Los criterios con * son obligatorios para pasar.</p>
        </div>
        {def.sections.map((s) => (
          <div key={s.id}>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{s.title}</div>
            <div className="space-y-3">
              {s.questions.map((q) => {
                const a = q.id === 'minimo' ? withAuto().answers.minimo : f.answers[q.id]
                return (
                  <div key={q.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
                    <TextField
                      label={`${q.label}${q.required ? ' *' : ''}`}
                      value={a?.note ?? ''}
                      placeholder="Nota (por qué)"
                      onChange={(v) => setAnswer(q.id, { note: v })}
                      disabled={q.id === 'minimo' && meets != null}
                    />
                    <SelectField
                      label="Respuesta"
                      value={a?.value ?? null}
                      onChange={(v) => setAnswer(q.id, { value: v })}
                      options={(Object.keys(ANSWER3) as Answer3[]).map((k) => ({ value: k, label: ANSWER3[k] }))}
                      disabled={q.id === 'minimo' && meets != null}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {!check.ok && <p className="text-xs text-ambar">Para que sea factible falta: {check.missing.join(' · ')}</p>}
        <div className="flex flex-wrap gap-2">
          <SaveBar dirty={dirty} busy={saver.busy} onSave={() => void saver.run(() => crm.saveProspect({ ...d, feasibility: withAuto() }))}>
            <Button
              variant="primary"
              disabled={!check.ok || saver.busy}
              onClick={() =>
                void saver
                  .run(() => crm.saveProspect({ ...d, stage: 'feasible', feasibility: { ...withAuto(), decision: 'feasible', decidedOn: todayInMexico(), decidedBy: staffName(session), reason: '' } }))
                  .then((ok) => ok && go('propuesta'))
              }
            >
              Es factible: pasar a propuesta
            </Button>
            <Button variant="ghost" onClick={() => setLosing(true)}>
              No es factible
            </Button>
          </SaveBar>
        </div>
        {f.decision && (
          <p className="text-xs text-muted">
            Dictamen: {f.decision === 'feasible' ? 'factible' : 'no factible'} · {fmtDate(f.decidedOn)} · {f.decidedBy}
          </p>
        )}
      </Card>
      {losing && <LostDialog crm={{ ...crm, prospect: { ...d, feasibility: { ...withAuto(), decision: 'not_feasible', decidedOn: todayInMexico(), decidedBy: staffName(session) } } }} step="factibilidad" category="not_feasible" close={() => setLosing(false)} />}
    </div>
  )
}
