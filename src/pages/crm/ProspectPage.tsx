import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CRM_STEPS, LOST_CATEGORY, PHASE, PROJECT_STAGE, PROSPECT_STAGE, STAGE_ORDER, options } from '../../domain/catalogs'
import { COMPANY_SIZE, companySize, currentStep, latestProposal, stepStates, type StepState } from '../../domain/crm'
import { todayInMexico } from '../../domain/dates'
import { fmtMoney } from '../../domain/format'
import { effectiveStage } from '../../domain/stage'
import type { CrmStep, LostCategory } from '../../domain/types'
import { SelectField, TextArea } from '../../ui/fields'
import { Button, Card, cx, Drawer, Eyebrow, Notice, Spinner } from '../../ui/kit'
import { useSaver } from '../project/ctx'
import { Guide } from './Guide'
import { useCrm, type Crm } from './useCrm'
import { AltaStep, DiscoveryStep, FeasibilityStep } from './StepsPreventa'
import { FollowStep, ProposalStep, SecondStep } from './StepsVenta'
import { ActaStep, ClosingStep, CobroStep } from './StepsConfirmado'

const STATE_ICON: Record<StepState, string> = { done: '✓', current: '●', pending: '○' }

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
  const def = CRM_STEPS.find((s) => s.step === selected) ?? CRM_STEPS[0]
  const pr = latestProposal(crm.proposals)
  const size = companySize(p.companyEmployees, crm.firm.companySizes)
  const stage = crm.project ? effectiveStage(crm.project) : null
  const active = p.stage !== 'lost' && p.stage !== 'client'
  const go = (step: CrmStep) => setParams({ paso: step }, { replace: true })

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <Link to="/crm" className="text-sm font-semibold text-accent">
        ← CRM
      </Link>
      <div className="mt-1 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>
            {PROSPECT_STAGE[p.stage]}
            {stage && p.stage === 'client' && ` · ${PROJECT_STAGE[stage]}`}
          </Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight">{p.company}</h1>
          <p className="text-sm text-muted">
            {[p.contactName && `${p.contactName}${p.contactRole ? `, ${p.contactRole}` : ''}`, size && `Empresa ${COMPANY_SIZE[size].toLowerCase()}`, pr?.price && fmtMoney(pr.price)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {crm.project && (
            <Link to={`/p/${crm.project.project.id}/${stage === 'confirmed' ? 'documentos' : 'proceso'}`} className="self-center text-sm font-semibold text-accent">
              {stage === 'confirmed' ? 'Expediente del proyecto' : 'Ir al proyecto en Operaciones'}
            </Link>
          )}
          {active && (
            <Button variant="ghost" onClick={() => setLosing(true)}>
              Marcar como perdido
            </Button>
          )}
          {p.stage === 'lost' && <Reopen crm={crm} />}
        </div>
      </div>
      {p.stage === 'lost' && p.lost && (
        <div className="mb-4">
          <Notice tone="warn">
            Perdido el {p.lost.on} en «{CRM_STEPS.find((s) => s.step === p.lost!.step)?.title}» · {LOST_CATEGORY[p.lost.category]}: {p.lost.reason}
          </Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <nav aria-label="Pasos del proceso" className="space-y-4">
          {(['preventa', 'venta'] as const).map((phase) => (
            <div key={phase}>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{PHASE[phase]}</div>
              <ol className="space-y-1">
                {CRM_STEPS.filter((s) => s.phase === phase).map((s) => (
                  <li key={s.step}>
                    <button
                      type="button"
                      onClick={() => go(s.step)}
                      className={cx(
                        'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm',
                        selected === s.step ? 'bg-accent-soft font-semibold text-accent-2' : 'hover:bg-soft',
                      )}
                    >
                      <span className={cx('mt-0.5 w-4 shrink-0 text-center text-xs', states[s.step] === 'done' ? 'text-accent' : states[s.step] === 'current' ? 'text-ambar' : 'text-muted')} aria-hidden>
                        {STATE_ICON[states[s.step]]}
                      </span>
                      <span>
                        {s.title}
                        <span className="block text-[11px] font-normal text-muted">{PROSPECT_STAGE[s.status]}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{PHASE.produccion}</div>
            <ol className="space-y-1 text-sm">
              {STAGE_ORDER.filter((s) => s !== 'confirmed').map((s) => {
                const reached = stage && stage !== 'confirmed' && STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(s)
                return (
                  <li key={s} className="flex items-start gap-2 px-2.5 py-1.5">
                    <span className={cx('mt-0.5 w-4 shrink-0 text-center text-xs', stage === s ? 'text-ambar' : reached ? 'text-accent' : 'text-muted')} aria-hidden>
                      {stage === s ? '●' : reached ? '✓' : '○'}
                    </span>
                    {crm.project && reached ? (
                      <Link to={`/p/${crm.project.project.id}/proceso`} className="text-ink2 hover:text-accent">
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
        </nav>

        <section className="min-w-0 space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-accent">
                  {PHASE[def.phase]} · {PROSPECT_STAGE[def.status]}
                </div>
                <h2 className="text-lg font-bold">{def.title}</h2>
              </div>
              <span className={cx('rounded-full px-2.5 py-0.5 text-xs font-semibold', states[def.step] === 'done' ? 'bg-accent-soft text-accent-2' : 'bg-soft text-muted')}>
                {states[def.step] === 'done' ? 'Listo' : states[def.step] === 'current' ? 'En curso' : 'Pendiente'}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink2">
              <b>Listo cuando:</b> {def.done}
            </p>
          </Card>
          <Guide guide={def.guide} />
          <StepPanel step={def.step} crm={crm} go={go} />
        </section>
      </div>
      {losing && <LostDialog crm={crm} step={cur ?? selected} close={() => setLosing(false)} />}
    </main>
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
            variant="danger"
            disabled={reason.trim().length < 3 || saver.busy}
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
        <TextArea label="Por qué, con detalle" rows={3} value={reason} onChange={setReason} />
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
      variant="ghost"
      disabled={saver.busy}
      onClick={() => void saver.run(() => crm.saveProspect({ ...p, stage: back === 'confirmed' ? 'feasible' : back, lost: null, feasibility: p.lost?.category === 'not_feasible' ? { ...p.feasibility!, decision: null } : p.feasibility }))}
    >
      Reabrir
    </Button>
  )
}
