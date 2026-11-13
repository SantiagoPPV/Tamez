import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useRepo } from '../../app/session'
import { useGlobal } from '../../app/useGlobal'
import { CRM_STEPS, LOST_CATEGORY, PROJECT_STAGE, PROSPECT_STAGE } from '../../domain/catalogs'
import { COMPANY_SIZE, companySize, currentStep, funnel, latestProposal, nextAction, normalizeProspect } from '../../domain/crm'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate, fmtMoney, fmtPct } from '../../domain/format'
import { effectiveStage } from '../../domain/stage'
import type { CrmStep, LostCategory, ProjectStage, Prospect, ProspectStage } from '../../domain/types'
import { FormGrid, NumberField, TextField } from '../../ui/fields'
import { Button, Card, cx, Drawer, Eyebrow, Notice, Spinner, Stat } from '../../ui/kit'
import { useSaver } from '../project/ctx'

const COLUMNS: { stage: ProspectStage; hint: string }[] = [
  { stage: 'initial', hint: 'Alta, descubrimiento y factibilidad' },
  { stage: 'feasible', hint: 'Propuesta, segunda entrevista y seguimiento' },
  { stage: 'confirmed', hint: 'Acta, cita de cierre y pago inicial' },
  { stage: 'client', hint: 'En Operaciones' },
]

export function blankProspect(): Prospect {
  return normalizeProspect({
    id: localId('pros'),
    company: '',
    contactName: '',
    contactRole: '',
    source: '',
    stage: 'initial',
    problem: '',
    budget: '',
    decisionMaker: '',
    decisionDate: null,
    nextStep: '',
    nextStepDate: null,
    lostReason: '',
    projectId: null,
    createdOn: todayInMexico(),
    notes: '',
  })
}

export function CrmBoard() {
  const prospects = useGlobal('prospects')
  const proposals = useGlobal('proposals')
  const repo = useRepo()
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const [showLost, setShowLost] = useState(false)
  const [stages, setStages] = useState<Record<string, ProjectStage>>({})
  useEffect(() => {
    void repo
      .loadAllProjects()
      .then((all) => setStages(Object.fromEntries(all.map((d) => [d.project.id, effectiveStage(d)]))))
      .catch(() => undefined)
  }, [repo])
  const f = useMemo(() => (prospects.rows && proposals.rows ? funnel(prospects.rows, proposals.rows) : null), [prospects.rows, proposals.rows])
  if (!prospects.rows || !proposals.rows || !f) return <Spinner />
  const all = prospects.rows.map(normalizeProspect).filter((p) => !q || `${p.company} ${p.contactName} ${p.problem}`.toLowerCase().includes(q.toLowerCase()))
  const lost = all.filter((p) => p.stage === 'lost')
  const maxLost = Math.max(1, ...Object.values(f.lostByStep))
  const today = todayInMexico()

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>CRM</Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight">Prospectos y clientes</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink2">
            Preventa, venta y producción en un solo flujo: cada prospecto avanza paso a paso con su formato base, y al cobrarse el pago inicial nace como cliente en
            Operaciones.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          Nuevo prospecto
        </Button>
      </div>
      {prospects.error && <Notice tone="error">{prospects.error}</Notice>}

      <Card className="mb-6 grid grid-cols-2 gap-4 p-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Prospectos activos" value={f.active} hint={`${f.total} en total`} />
        <Stat label="Pasan factibilidad" value={f.passRate == null ? '—' : fmtPct(f.passRate)} hint={`${f.feasible} de ${f.feasibilityDecided} analizados`} />
        <Stat label="Propuestas presentadas" value={f.presented} hint={f.winRate == null ? 'Sin cierres todavía' : `${fmtPct(f.winRate)} terminan en sí`} />
        <Stat label="Por cobrar el inicio" value={f.byStage.confirmed} hint="Prospectos confirmados" />
        <Stat label="Clientes" value={f.clients} />
        <Stat label="En venta" value={fmtMoney(f.pipeline)} hint="Valor de las propuestas abiertas" />
      </Card>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="w-full rounded-lg border border-rule px-3 py-1.5 text-sm sm:w-72" placeholder="Buscar empresa, contacto o problema" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar prospectos" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = all.filter((p) => p.stage === col.stage)
          return (
            <section key={col.stage} className="min-w-0">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                {PROSPECT_STAGE[col.stage]} <span className="font-normal">({list.length})</span>
              </h2>
              <p className="mb-2 text-xs text-muted">{col.hint}</p>
              <ul className="space-y-2">
                {list.length === 0 && <li className="rounded-xl border border-dashed border-rule px-3 py-4 text-center text-xs text-muted">Sin prospectos</li>}
                {list.map((p) => {
                  const mine = proposals.rows!.filter((x) => x.prospectId === p.id)
                  const ctx = { prospect: p, proposals: mine, project: null }
                  const step = currentStep(ctx)
                  const next = nextAction(ctx)
                  const pr = latestProposal(mine)
                  const size = companySize(p.companyEmployees)
                  const late = next?.on && next.on < today
                  const stage = p.projectId ? stages[p.projectId] : undefined
                  return (
                    <li key={p.id}>
                      <Link to={`/crm/${p.id}`} className="block">
                        <Card className="p-3 transition-colors hover:border-accent-mid">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 text-sm font-semibold">{p.company}</div>
                            {pr?.price ? <div className="num shrink-0 text-xs font-semibold text-ink2">{fmtMoney(pr.price)}</div> : null}
                          </div>
                          <div className="mt-0.5 text-xs text-muted">
                            {p.contactName || 'Sin contacto'}
                            {size && ` · ${COMPANY_SIZE[size]}`}
                          </div>
                          {p.stage === 'client' ? (
                            <div className="mt-2 text-xs font-semibold text-accent-2">{stage ? PROJECT_STAGE[stage] : 'Cliente'}</div>
                          ) : (
                            <>
                              {step && <div className="mt-2 text-xs font-semibold text-ink2">{CRM_STEPS.find((s) => s.step === step)?.title}</div>}
                              {next && (
                                <div className={cx('text-xs', late ? 'font-semibold text-rojo' : 'text-muted')}>
                                  {next.text}
                                  {next.on && ` · ${fmtDate(next.on)}`}
                                </div>
                              )}
                            </>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {pr?.validation?.requestedOn && !pr.validation.approvedOn && <span className="rounded-full bg-ambar-soft px-2 py-0.5 text-[11px] font-semibold text-ambar">Propuesta por validar</span>}
                            {p.gate1?.requestedOn && !p.gate1.approvedOn && <span className="rounded-full bg-ambar-soft px-2 py-0.5 text-[11px] font-semibold text-ambar">Puerta 1 por aprobar</span>}
                          </div>
                        </Card>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Dónde se caen los prospectos</h2>
          <Button size="sm" variant="ghost" onClick={() => setShowLost((x) => !x)}>
            {showLost ? 'Ocultar perdidos' : `Ver los ${lost.length} perdidos`}
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Por paso del proceso</h3>
            <ul className="space-y-1.5">
              {CRM_STEPS.map((s) => (
                <li key={s.step} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_2rem] items-center gap-2 text-sm">
                  <span className="truncate text-ink2">{s.title}</span>
                  <span className="h-2.5 rounded-full bg-soft">
                    <span className="block h-2.5 rounded-full bg-rojo/70" style={{ width: `${(f.lostByStep[s.step as CrmStep] / maxLost) * 100}%` }} />
                  </span>
                  <span className="num text-right text-xs text-muted">{f.lostByStep[s.step as CrmStep]}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Por motivo</h3>
            <ul className="space-y-1.5 text-sm">
              {(Object.keys(LOST_CATEGORY) as LostCategory[])
                .filter((k) => f.lostByCategory[k])
                .map((k) => (
                  <li key={k} className="flex justify-between">
                    <span className="text-ink2">{LOST_CATEGORY[k]}</span>
                    <span className="num font-semibold">{f.lostByCategory[k]}</span>
                  </li>
                ))}
              {!f.lost && <li className="text-muted">Ningún prospecto perdido.</li>}
            </ul>
          </Card>
        </div>
        {showLost && (
          <ul className="mt-4 space-y-2">
            {lost.map((p) => (
              <li key={p.id}>
                <Link to={`/crm/${p.id}`} className="block">
                  <Card className="flex flex-wrap items-center justify-between gap-2 p-3 hover:border-accent-mid">
                    <span>
                      <span className="font-semibold">{p.company}</span>
                      <span className="ml-2 text-xs text-muted">
                        {p.lost ? `${CRM_STEPS.find((s) => s.step === p.lost!.step)?.title} · ${LOST_CATEGORY[p.lost.category]}` : p.lostReason}
                      </span>
                    </span>
                    <span className="text-xs text-muted">{p.lost?.reason}</span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {creating && <NewProspect close={() => setCreating(false)} save={prospects.save} />}
    </main>
  )
}

function NewProspect({ close, save }: { close: () => void; save: (p: Prospect) => Promise<Prospect> }) {
  const [d, setD] = useState(blankProspect)
  const saver = useSaver()
  const navigate = useNavigate()
  const set = <K extends keyof Prospect>(k: K, v: Prospect[K]) => setD((x) => ({ ...x, [k]: v }))
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!d.company.trim()) return saver.setError('Escribe el nombre de la empresa.')
    const ok = await saver.run(async () => {
      const saved = await save(d)
      navigate(`/crm/${saved.id}`)
    })
    if (ok) close()
  }
  return (
    <Drawer open onClose={close} title="Nuevo prospecto" subtitle="Prospecto inicial: después se programa la junta de descubrimiento">
      <form onSubmit={submit} className="space-y-4">
        {saver.error && <Notice tone="error">{saver.error}</Notice>}
        <FormGrid>
          <TextField className="sm:col-span-2" label="Empresa" value={d.company} onChange={(v) => set('company', v)} required />
          <TextField label="Contacto" value={d.contactName} onChange={(v) => set('contactName', v)} />
          <TextField label="Puesto" value={d.contactRole} onChange={(v) => set('contactRole', v)} />
          <TextField label="Correo" value={d.contactEmail ?? ''} onChange={(v) => set('contactEmail', v.trim())} />
          <TextField label="Teléfono o WhatsApp" value={d.contactPhone ?? ''} onChange={(v) => set('contactPhone', v)} />
          <TextField label="De dónde llegó" value={d.source} onChange={(v) => set('source', v)} />
          <TextField label="Giro" value={d.industry ?? ''} onChange={(v) => set('industry', v)} />
          <NumberField label="Empleados de la empresa" value={d.companyEmployees ?? null} onChange={(v) => set('companyEmployees', v)} />
          <NumberField label="Empleados que usarían el sistema" value={d.projectUsers ?? null} onChange={(v) => set('projectUsers', v)} />
        </FormGrid>
        <Button type="submit" variant="primary" disabled={saver.busy}>
          {saver.busy ? 'Guardando…' : 'Dar de alta'}
        </Button>
      </form>
    </Drawer>
  )
}
