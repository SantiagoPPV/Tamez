import { useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, CircleCheck, CircleX, Mail, Phone, RotateCcw, UserRound } from 'lucide-react'
import { CRM_STEPS, LOST_CATEGORY, PHASE, PROJECT_STAGE, PROSPECT_STAGE, STAGE_ORDER, options } from '../../domain/catalogs'
import { COMPANY_SIZE, companySize, currentStep, daysSince, latestProposal, stepStates, type StepState } from '../../domain/crm'
import { todayInMexico } from '../../domain/dates'
import { fmtDate, fmtMoney } from '../../domain/format'
import { effectiveStage } from '../../domain/stage'
import type { CrmStep, LostCategory, ProspectStage } from '../../domain/types'
import { fieldClass, SelectField, TextArea } from '../../ui/fields'
import { Badge, Button, Card, cx, Drawer, LinkButton, Notice, PageHeader, ProgressBar, Spinner, type Tone } from '../../ui/kit'
import { useSaver } from '../project/ctx'
import { Guide } from './Guide'
import { useCrm, type Crm } from './useCrm'
import { AltaStep, DiscoveryStep, FeasibilityStep } from './StepsPreventa'
import { FollowStep, ProposalStep, SecondStep } from './StepsVenta'
import { ActaStep, ClosingStep, CobroStep } from './StepsConfirmado'

const STAGE_TONE: Record<ProspectStage, Tone> = { initial: 'gray', feasible: 'navy', confirmed: 'solid', client: 'green', lost: 'red' }
const STATE_LABEL: Record<StepState, string> = { done: 'Listo', current: 'En curso', pending: 'Pendiente' }
const STATE_TONE: Record<StepState, Tone> = { done: 'green', current: 'navy', pending: 'gray' }

export function ProspectPage() {
  const { prospectId = '' } = useParams()
  const crm = useCrm(prospectId)
  const [params, setParams] = useSearchParams()
  const [losing, setLosing] = useState(false)
  if (!crm.ready) return <Spinner />
  if (!crm.prospect || !crm.ctx)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Notice tone="error">No existe ese prospecto.</Notice>
      </div>
    )
  const p = crm.prospect
  const states = stepStates(crm.ctx)
  const cur = currentStep(crm.ctx)
  const selected = (params.get('paso') as CrmStep | null) ?? cur ?? 'alta'
  const index = Math.max(0, CRM_STEPS.findIndex((s) => s.step === selected))
  const def = CRM_STEPS[index]
  const pr = latestProposal(crm.proposals)
  const size = companySize(p.companyEmployees, crm.firm.companySizes)
  const stage = crm.project ? effectiveStage(crm.project) : null
  const active = p.stage !== 'lost' && p.stage !== 'client'
  const done = Object.values(states).filter((s) => s === 'done').length
  const days = daysSince(p.createdOn)
  const age = days != null && days >= 0 ? days : null
  const go = (step: CrmStep) => setParams({ paso: step }, { replace: true })
  const prev = CRM_STEPS[index - 1]
  const next = CRM_STEPS[index + 1]

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        back={{ to: '/crm', label: 'CRM' }}
        eyebrow={
          <>
            {PROSPECT_STAGE[p.stage]}
            {stage && p.stage === 'client' && ` · ${PROJECT_STAGE[stage]}`}
          </>
        }
        title={p.company}
        meta={
          <>
            <Badge tone={STAGE_TONE[p.stage]} dot>
              {PROSPECT_STAGE[p.stage]}
            </Badge>
            {stage && stage !== 'confirmed' && <Badge tone="green">{PROJECT_STAGE[stage]}</Badge>}
            {size && <Badge tone="gray">Empresa {COMPANY_SIZE[size].toLowerCase()}</Badge>}
            {p.industry && <Badge tone="gray">{p.industry}</Badge>}
            {pr?.price ? <Badge tone="navy">{fmtMoney(pr.price)}</Badge> : null}
          </>
        }
        actions={
          <>
            {crm.project && (
              <LinkButton to={`/p/${crm.project.project.id}/${stage === 'confirmed' ? 'documentos' : 'proceso'}`} icon={<ArrowUpRight />}>
                {stage === 'confirmed' ? 'Expediente del proyecto' : 'Ir al proyecto en Operaciones'}
              </LinkButton>
            )}
            {active && (
              <Button variant="ghost" icon={<CircleX />} onClick={() => setLosing(true)}>
                Marcar como perdido
              </Button>
            )}
            {p.stage === 'lost' && <Reopen crm={crm} />}
          </>
        }
      />

      <Card className="mb-6 grid grid-cols-1 divide-y divide-rule sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <Fact label="Contacto">
          <div className="font-semibold text-ink">{p.contactName || 'Sin contacto'}</div>
          {p.contactRole && <div className="text-xs text-muted">{p.contactRole}</div>}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {p.contactEmail && (
              <a href={`mailto:${p.contactEmail}`} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                <Mail className="size-3.5" aria-hidden />
                {p.contactEmail}
              </a>
            )}
            {p.contactPhone && (
              <a href={`tel:${p.contactPhone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                <Phone className="size-3.5" aria-hidden />
                {p.contactPhone}
              </a>
            )}
          </div>
        </Fact>
        <Fact label="Quién decide">
          {p.decisionMaker ? (
            <>
              <div className="flex items-center gap-1.5 font-semibold text-ink">
                <UserRound className="size-4 text-accent" aria-hidden />
                {p.decisionMaker}
              </div>
              {p.decisionMakerRole && <div className="text-xs text-muted">{p.decisionMakerRole}</div>}
            </>
          ) : (
            <div className="text-sm text-muted">Se define en la junta de descubrimiento</div>
          )}
        </Fact>
        <Fact label="Propuesta">
          {pr ? (
            <>
              <div className="num font-semibold text-ink">{pr.price ? fmtMoney(pr.price) : 'Sin precio'}</div>
              <div className="text-xs text-muted">
                v{pr.version} · {pr.validation?.approvedOn ? `validada el ${fmtDate(pr.validation.approvedOn)}` : pr.validation?.requestedOn ? 'por validar' : 'sin validar'}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted">Se hace después de la factibilidad</div>
          )}
        </Fact>
        <Fact label="Avance en el CRM">
          <div className="flex items-baseline justify-between gap-2">
            <span className="num font-semibold text-ink">
              {done} de {CRM_STEPS.length} pasos
            </span>
            {age != null && <span className="text-xs text-muted">{age === 0 ? 'alta hoy' : `${age} días desde el alta`}</span>}
          </div>
          <div className="mt-2">
            <ProgressBar value={done} max={CRM_STEPS.length} tone={p.stage === 'client' ? 'green' : p.stage === 'lost' ? 'red' : 'navy'} label="Avance en el CRM" />
          </div>
        </Fact>
      </Card>

      {p.stage === 'lost' && p.lost && (
        <div className="mb-5">
          <Notice tone="warn" title={`Perdido el ${fmtDate(p.lost.on)} en «${CRM_STEPS.find((s) => s.step === p.lost!.step)?.title}»`}>
            {LOST_CATEGORY[p.lost.category]}: {p.lost.reason}
          </Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        {/* Celular: selector compacto del paso. */}
        <div className="lg:hidden">
          <label className="mb-1.5 block text-[13px] font-semibold text-ink2" htmlFor="paso-movil">
            Paso del proceso
          </label>
          <select id="paso-movil" className={fieldClass} value={selected} onChange={(e) => go(e.target.value as CrmStep)}>
            {CRM_STEPS.map((s, i) => (
              <option key={s.step} value={s.step}>
                {i + 1}. {s.title} · {STATE_LABEL[states[s.step]]}
              </option>
            ))}
          </select>
        </div>

        <nav aria-label="Pasos del proceso" className="hidden lg:block">
          <div className="sticky top-20 space-y-5 rounded-2xl border border-rule bg-white p-4 shadow-card">
            {(['preventa', 'venta'] as const).map((phase) => (
              <div key={phase}>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{PHASE[phase]}</div>
                <ol>
                  {CRM_STEPS.filter((s) => s.phase === phase).map((s, i, arr) => {
                    const n = CRM_STEPS.findIndex((x) => x.step === s.step) + 1
                    const st = states[s.step]
                    const on = selected === s.step
                    return (
                      <li key={s.step} className="relative">
                        {i < arr.length - 1 && <span className={cx('absolute top-10 -bottom-2 left-[1.65rem] w-0.5 -translate-x-1/2 rounded-full', st === 'done' ? 'bg-accent' : 'bg-rule')} aria-hidden />}
                        <button
                          type="button"
                          onClick={() => go(s.step)}
                          aria-current={on ? 'step' : undefined}
                          className={cx('relative flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors', on ? 'bg-accent-soft' : 'hover:bg-soft')}
                        >
                          <StepDot n={n} state={st} />
                          <span className="min-w-0 pt-0.5">
                            <span className={cx('block leading-snug', on ? 'font-bold text-accent-2' : st === 'pending' ? 'text-ink2' : 'font-semibold text-ink')}>{s.title}</span>
                            <span className="block text-[11px] text-muted">{PROSPECT_STAGE[s.status]}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{PHASE.produccion}</div>
              <ol className="space-y-1 text-sm">
                {STAGE_ORDER.filter((s) => s !== 'confirmed').map((s) => {
                  const reached = stage && stage !== 'confirmed' && STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(s)
                  const now = stage === s
                  return (
                    <li key={s} className="flex items-center gap-3 px-2 py-1">
                      <span
                        className={cx(
                          'grid size-5 shrink-0 place-items-center rounded-full',
                          now ? 'bg-verde text-white' : reached ? 'bg-verde-soft text-verde' : 'border border-rule bg-white text-muted',
                        )}
                        aria-hidden
                      >
                        {reached && !now ? <Check className="size-3" /> : <span className={cx('size-1.5 rounded-full', now ? 'bg-white' : 'bg-rule')} />}
                      </span>
                      {crm.project && reached ? (
                        <Link to={`/p/${crm.project.project.id}/proceso`} className={cx('hover:text-accent', now ? 'font-semibold text-ink' : 'text-ink2')}>
                          {PROJECT_STAGE[s]}
                        </Link>
                      ) : (
                        <span className="text-muted">{PROJECT_STAGE[s]}</span>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </nav>

        <section className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <StepDot n={index + 1} state={states[def.step]} large />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                    Paso {index + 1} de {CRM_STEPS.length} · {PHASE[def.phase]} · {PROSPECT_STAGE[def.status]}
                  </div>
                  <h2 className="mt-0.5 text-xl font-bold tracking-tight text-ink">{def.title}</h2>
                </div>
              </div>
              <Badge tone={STATE_TONE[states[def.step]]} dot>
                {STATE_LABEL[states[def.step]]}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-surface px-4 py-3 sm:px-5">
              <p className="flex min-w-0 items-start gap-2 text-sm text-ink2">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-verde" aria-hidden />
                <span>
                  <b className="text-ink">Listo cuando:</b> {def.done}
                </span>
              </p>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" icon={<ChevronLeft />} disabled={!prev} onClick={() => prev && go(prev.step)} aria-label="Paso anterior">
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                <Button size="sm" variant="ghost" disabled={!next} onClick={() => next && go(next.step)} aria-label="Paso siguiente">
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="size-3.5" aria-hidden />
                </Button>
              </div>
            </div>
          </Card>
          <Guide guide={def.guide} />
          <StepPanel step={def.step} crm={crm} go={go} />
        </section>
      </div>
      {losing && <LostDialog crm={crm} step={cur ?? selected} close={() => setLosing(false)} />}
    </main>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3.5 sm:px-5">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function StepDot({ n, state, large }: { n: number; state: StepState; large?: boolean }) {
  return (
    <span
      className={cx(
        'relative grid shrink-0 place-items-center rounded-full text-xs font-bold',
        large ? 'size-10 text-sm' : 'size-[2.3rem]',
        state === 'done' && 'bg-accent text-white',
        state === 'current' && 'bg-white text-accent ring-2 ring-accent',
        state === 'pending' && 'bg-white text-muted ring-1 ring-rule',
      )}
      aria-hidden
    >
      {state === 'done' ? <Check className={large ? 'size-5' : 'size-4'} /> : n}
    </span>
  )
}

function StepPanel({ step, crm, go }: { step: CrmStep; crm: Crm; go: (s: CrmStep) => void }) {
  switch (step) {
    case 'alta':
      return <AltaStep crm={crm} go={go} />
    case 'descubrimiento':
      return <DiscoveryStep crm={crm} go={go} />
    case 'factibilidad':
      return <FeasibilityStep crm={crm} go={go} />
    case 'propuesta':
      return <ProposalStep crm={crm} go={go} />
    case 'segunda':
      return <SecondStep crm={crm} go={go} />
    case 'seguimiento':
      return <FollowStep crm={crm} go={go} />
    case 'acta':
      return <ActaStep crm={crm} go={go} />
    case 'cierre':
      return <ClosingStep crm={crm} go={go} />
    case 'cobro':
      return <CobroStep crm={crm} go={go} />
  }
}

/** Si es un no: se pasa a perdidos con el paso donde se cayó y el porqué. */
export function LostDialog({ crm, step, close, category = 'other' }: { crm: Crm; step: CrmStep; close: () => void; category?: LostCategory }) {
  const [cat, setCat] = useState<LostCategory>(category)
  const [reason, setReason] = useState('')
  const saver = useSaver()
  const p = crm.prospect!
  return (
    <Drawer
      open
      onClose={close}
      title="Marcar como perdido"
      subtitle={`Se registra en «${CRM_STEPS.find((s) => s.step === step)?.title}» para medir dónde se caen los prospectos`}
      footer={
        <div className="flex gap-2">
          <Button
            variant="destructive"
            icon={<CircleX />}
            disabled={reason.trim().length < 3}
            loading={saver.busy}
            onClick={() =>
              void saver
                .run(() => crm.saveProspect({ ...p, stage: 'lost', lostReason: reason.trim(), lost: { on: todayInMexico(), step, category: cat, reason: reason.trim() } }))
                .then((ok) => ok && close())
            }
          >
            Pasar a perdidos
          </Button>
          <Button onClick={close}>Cancelar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {saver.error && <Notice tone="error">{saver.error}</Notice>}
        <SelectField label="Motivo" value={cat} onChange={(v) => v && setCat(v)} options={options(LOST_CATEGORY)} allowEmpty={false} />
        <TextArea label="Por qué, con detalle" rows={3} value={reason} onChange={setReason} required />
      </div>
    </Drawer>
  )
}

function Reopen({ crm }: { crm: Crm }) {
  const saver = useSaver()
  const p = crm.prospect!
  const back = CRM_STEPS.find((s) => s.step === p.lost?.step)?.status ?? 'initial'
  return (
    <Button
      icon={<RotateCcw />}
      loading={saver.busy}
      onClick={() => void saver.run(() => crm.saveProspect({ ...p, stage: back === 'confirmed' ? 'feasible' : back, lost: null, feasibility: p.lost?.category === 'not_feasible' ? { ...p.feasibility!, decision: null } : p.feasibility }))}
    >
      Reabrir
    </Button>
  )
}
