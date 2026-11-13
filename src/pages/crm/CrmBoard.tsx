import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  BriefcaseBusiness,
  CircleDollarSign,
  Clock,
  FileText,
  Filter,
  HandCoins,
  LayoutGrid,
  List,
  Plus,
  Search,
  ShieldCheck,
  TrendingDown,
  Users,
  DoorOpen,
} from 'lucide-react'
import { useRepo } from '../../app/session'
import { useGlobal } from '../../app/useGlobal'
import { CRM_STEPS, LOST_CATEGORY, PROJECT_STAGE, PROSPECT_STAGE } from '../../domain/catalogs'
import { COMPANY_SIZE, companySize, currentStep, daysSince, funnel, latestProposal, nextAction, normalizeProspect, stepStates } from '../../domain/crm'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate, fmtMoney, fmtPct } from '../../domain/format'
import { effectiveStage } from '../../domain/stage'
import type { CrmStep, LostCategory, ProjectData, Proposal, Prospect, ProspectStage } from '../../domain/types'
import { fieldClass, FormGrid, NumberField, TextField } from '../../ui/fields'
import { Avatar, Badge, Button, Card, CardHeader, cx, DataTable, Drawer, EmptyState, KpiCard, Notice, PageHeader, ProgressBar, Segmented, Spinner, type Tone } from '../../ui/kit'
import { useSaver } from '../project/ctx'

const COLUMNS: { stage: ProspectStage; hint: string; tone: Tone; dot: string }[] = [
  { stage: 'initial', hint: 'Alta, descubrimiento y factibilidad', tone: 'gray', dot: 'bg-muted' },
  { stage: 'feasible', hint: 'Propuesta, segunda entrevista y seguimiento', tone: 'navy', dot: 'bg-accent-mid' },
  { stage: 'confirmed', hint: 'Acta, cita de cierre y pago inicial', tone: 'navy', dot: 'bg-accent' },
  { stage: 'client', hint: 'En Operaciones', tone: 'green', dot: 'bg-verde' },
]
const STAGE_TONE: Record<ProspectStage, Tone> = { initial: 'gray', feasible: 'navy', confirmed: 'solid', client: 'green', lost: 'red' }

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

/** Lo que se ve de cada prospecto en el tablero y en la lista. */
interface Row {
  p: Prospect
  pr: Proposal | null
  step: CrmStep | null
  done: number
  next: { text: string; on: string | null } | null
  late: boolean
  stageLabel: string | null
  flags: string[]
}

export function CrmBoard() {
  const prospects = useGlobal('prospects')
  const proposals = useGlobal('proposals')
  const repo = useRepo()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const [view, setView] = useState<'board' | 'list'>('board')
  const [showLost, setShowLost] = useState(false)
  const [projects, setProjects] = useState<Record<string, ProjectData>>({})
  useEffect(() => {
    void repo
      .loadAllProjects()
      .then((all) => setProjects(Object.fromEntries(all.map((d) => [d.project.id, d]))))
      .catch(() => undefined)
  }, [repo])
  const f = useMemo(() => (prospects.rows && proposals.rows ? funnel(prospects.rows, proposals.rows) : null), [prospects.rows, proposals.rows])
  const today = todayInMexico()
  const rows = useMemo<Row[]>(() => {
    if (!prospects.rows || !proposals.rows) return []
    return prospects.rows.map(normalizeProspect).map((p) => {
      const mine = proposals.rows!.filter((x) => x.prospectId === p.id)
      const project = p.projectId ? (projects[p.projectId] ?? null) : null
      const ctx = { prospect: p, proposals: mine, project }
      const states = stepStates(ctx)
      const pr = latestProposal(mine)
      const next = nextAction(ctx)
      const flags: string[] = []
      if (pr?.validation?.requestedOn && !pr.validation.approvedOn) flags.push('Propuesta por validar')
      if (p.gate1?.requestedOn && !p.gate1.approvedOn) flags.push('Puerta 1 por aprobar')
      return {
        p,
        pr,
        step: currentStep(ctx),
        done: Object.values(states).filter((s) => s === 'done').length,
        next,
        late: Boolean(next?.on && next.on < today),
        stageLabel: project ? PROJECT_STAGE[effectiveStage(project)] : null,
        flags,
      }
    })
  }, [prospects.rows, proposals.rows, projects, today])

  if (!prospects.rows || !proposals.rows || !f) return <Spinner />
  const term = q.trim().toLowerCase()
  const shown = rows.filter((r) => !term || `${r.p.company} ${r.p.contactName} ${r.p.problem} ${r.p.industry ?? ''}`.toLowerCase().includes(term))
  const active = shown.filter((r) => r.p.stage !== 'lost')
  const lost = shown.filter((r) => r.p.stage === 'lost')
  const maxLost = Math.max(1, ...Object.values(f.lostByStep))
  const maxCat = Math.max(1, ...Object.values(f.lostByCategory))
  const attention = rows.filter((r) => r.late || r.flags.length).length

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="CRM"
        title="Prospectos y clientes"
        subtitle="Preventa, venta y producción en un solo flujo: cada prospecto avanza paso a paso con su formato base y, al cobrarse el pago inicial, nace como cliente en Operaciones."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
            Nuevo prospecto
          </Button>
        }
      />
      {prospects.error && <Notice tone="error">{prospects.error}</Notice>}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Prospectos activos" value={f.active} hint={`${f.total} en total`} icon={<Users />} />
        <KpiCard label="Pasan factibilidad" value={f.passRate == null ? '—' : fmtPct(f.passRate)} hint={`${f.feasible} de ${f.feasibilityDecided} analizados`} icon={<Filter />} />
        <KpiCard label="Propuestas presentadas" value={f.presented} hint={f.winRate == null ? 'Sin cierres todavía' : `${fmtPct(f.winRate)} terminan en sí`} icon={<FileText />} />
        <KpiCard label="Por cobrar el inicio" value={f.byStage.confirmed} hint="Prospectos confirmados" icon={<HandCoins />} tone="amber" />
        <KpiCard label="Clientes" value={f.clients} hint="Ya en Operaciones" icon={<BriefcaseBusiness />} tone="green" />
        <KpiCard label="En venta" value={fmtMoney(f.pipeline)} hint="Valor de las propuestas abiertas" icon={<CircleDollarSign />} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-80">
          <span className="sr-only">Buscar prospectos</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className={cx(fieldClass, 'pl-9')} placeholder="Buscar empresa, contacto o problema" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar prospectos" />
        </label>
        <Segmented
          label="Vista"
          value={view}
          onChange={setView}
          options={[
            {
              value: 'board',
              label: (
                <>
                  <LayoutGrid className="size-4" aria-hidden /> Tablero
                </>
              ),
            },
            {
              value: 'list',
              label: (
                <>
                  <List className="size-4" aria-hidden /> Lista
                </>
              ),
            },
          ]}
        />
        {attention > 0 && (
          <Badge tone="amber" icon={<Clock />} className="ml-auto">
            {attention} {attention === 1 ? 'pide' : 'piden'} atención
          </Badge>
        )}
      </div>

      {view === 'board' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const list = active.filter((r) => r.p.stage === col.stage)
            const total = list.reduce((s, r) => s + (r.pr?.price ?? 0), 0)
            return (
              <section key={col.stage} className="flex min-w-0 flex-col rounded-2xl border border-rule bg-soft/60 p-2.5">
                <header className="px-1.5 pt-1 pb-3">
                  <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-ink">
                    <span className={cx('size-2.5 shrink-0 rounded-full', col.dot)} aria-hidden />
                    <span>{PROSPECT_STAGE[col.stage]}</span>
                    <span className="num rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink2 ring-1 ring-rule">{list.length}</span>
                  </h2>
                  <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-muted">
                    <span>{col.hint}</span>
                    {total > 0 && <span className="num font-semibold text-ink2">{fmtMoney(total)}</span>}
                  </p>
                </header>
                <ul className="flex-1 space-y-2.5">
                  {list.length === 0 && <li className="rounded-xl border border-dashed border-rule bg-white/60 px-3 py-6 text-center text-xs text-muted">Sin prospectos</li>}
                  {list.map((r) => (
                    <li key={r.p.id}>
                      <ProspectCard r={r} />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ) : (
        <DataTable
          rows={active}
          rowKey={(r) => r.p.id}
          onRowClick={(r) => navigate(`/crm/${r.p.id}`)}
          empty="Ningún prospecto coincide con la búsqueda."
          columns={[
            {
              label: 'Empresa',
              render: (r) => (
                <div className="flex items-center gap-3">
                  <Avatar name={r.p.company} tone="soft" size="sm" />
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{r.p.company}</div>
                    <div className="text-xs text-muted">{r.p.contactName || 'Sin contacto'}</div>
                  </div>
                </div>
              ),
            },
            { label: 'Estado', render: (r) => <Badge tone={STAGE_TONE[r.p.stage]}>{PROSPECT_STAGE[r.p.stage]}</Badge> },
            {
              label: 'Paso',
              className: 'min-w-[12rem]',
              render: (r) =>
                r.p.stage === 'client' ? (
                  <span className="text-sm text-verde">{r.stageLabel ?? 'Cliente'}</span>
                ) : (
                  <div>
                    <div className="text-sm text-ink">{CRM_STEPS.find((s) => s.step === r.step)?.title ?? '—'}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <ProgressBar value={r.done} max={CRM_STEPS.length} size="sm" label="Avance en el CRM" />
                      <span className="num shrink-0 text-[11px] text-muted">
                        {r.done}/{CRM_STEPS.length}
                      </span>
                    </div>
                  </div>
                ),
            },
            {
              label: 'Siguiente acción',
              render: (r) =>
                r.next ? (
                  <div className={cx('text-sm', r.late ? 'font-semibold text-rojo' : 'text-ink2')}>
                    {r.next.text}
                    {r.next.on && <div className="num text-xs">{fmtDate(r.next.on)}</div>}
                  </div>
                ) : (
                  <span className="text-muted">—</span>
                ),
            },
            { label: 'Monto', headClassName: 'text-right', className: 'num text-right font-semibold', render: (r) => (r.pr?.price ? fmtMoney(r.pr.price) : '—') },
            { label: 'Alta', className: 'num text-xs text-muted', render: (r) => fmtDate(r.p.createdOn) },
          ]}
          card={(r) => <ProspectCardBody r={r} />}
        />
      )}

      <section className="mt-10">
        <Card>
          <CardHeader
            icon={<TrendingDown />}
            title="Dónde se caen los prospectos"
            subtitle="Cada perdido cuenta en el paso donde se cayó y con su motivo."
            actions={
              <Button size="sm" variant="ghost" onClick={() => setShowLost((x) => !x)}>
                {showLost ? 'Ocultar perdidos' : `Ver los ${lost.length} perdidos`}
              </Button>
            }
          />
          <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Por paso del proceso</h3>
              <ul className="space-y-2">
                {CRM_STEPS.map((s) => {
                  const n = f.lostByStep[s.step as CrmStep]
                  return (
                    <li key={s.step} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
                      <span className={cx('truncate', n ? 'font-semibold text-ink' : 'text-ink2')}>{s.title}</span>
                      <span className="h-2.5 rounded-full bg-soft">
                        <span className="block h-2.5 rounded-full bg-rojo/75" style={{ width: `${(n / maxLost) * 100}%` }} />
                      </span>
                      <span className="num text-right text-xs text-muted">{n}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Por motivo</h3>
              {!f.lost ? (
                <p className="text-sm text-muted">Ningún prospecto perdido.</p>
              ) : (
                <ul className="space-y-2">
                  {(Object.keys(LOST_CATEGORY) as LostCategory[])
                    .filter((k) => f.lostByCategory[k])
                    .map((k) => (
                      <li key={k} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
                        <span className="truncate text-ink2">{LOST_CATEGORY[k]}</span>
                        <span className="h-2.5 rounded-full bg-soft">
                          <span className="block h-2.5 rounded-full bg-accent/70" style={{ width: `${(f.lostByCategory[k] / maxCat) * 100}%` }} />
                        </span>
                        <span className="num text-right text-xs font-semibold text-ink">{f.lostByCategory[k]}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
          {showLost && (
            <ul className="divide-y divide-rule border-t border-rule">
              {lost.length === 0 && <li className="px-5 py-4 text-sm text-muted">Ningún perdido coincide con la búsqueda.</li>}
              {lost.map(({ p }) => (
                <li key={p.id}>
                  <Link to={`/crm/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-accent-soft/40 sm:px-5">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={p.company} tone="soft" size="sm" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{p.company}</span>
                        <span className="block text-xs text-muted">
                          {p.lost ? `${CRM_STEPS.find((s) => s.step === p.lost!.step)?.title} · ${LOST_CATEGORY[p.lost.category]}` : p.lostReason}
                        </span>
                      </span>
                    </span>
                    <span className="max-w-md text-xs text-ink2">{p.lost?.reason}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
      {creating && <NewProspect close={() => setCreating(false)} save={prospects.save} />}
      {rows.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<Users />}
            title="Todavía no hay prospectos"
            action={
              <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
                Dar de alta el primero
              </Button>
            }
          >
            Cada prospecto empieza con su alta y la junta de descubrimiento.
          </EmptyState>
        </div>
      )}
    </main>
  )
}

function ProspectCard({ r }: { r: Row }) {
  return (
    <Link to={`/crm/${r.p.id}`} className="block rounded-xl border border-rule bg-white p-3.5 shadow-card transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-accent-mid hover:shadow-pop focus-visible:-translate-y-px">
      <ProspectCardBody r={r} />
    </Link>
  )
}

function ProspectCardBody({ r }: { r: Row }) {
  const { p, pr, next } = r
  const size = companySize(p.companyEmployees)
  const days = daysSince(p.createdOn)
  const age = days != null && days >= 0 ? days : null
  return (
    <div>
      <div className="flex items-start gap-3">
        <Avatar name={p.company} tone="soft" size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-sm leading-snug font-semibold text-ink">{p.company}</div>
            {pr?.price ? <div className="num shrink-0 text-xs font-bold text-ink">{fmtMoney(pr.price)}</div> : null}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted">
            {p.contactName || 'Sin contacto'}
            {size && ` · ${COMPANY_SIZE[size]}`}
          </div>
        </div>
      </div>
      {p.stage === 'client' ? (
        <div className="mt-3">
          <Badge tone="green" dot>
            {r.stageLabel ?? 'Cliente'}
          </Badge>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted">
              <span className="truncate font-semibold text-ink2">{CRM_STEPS.find((s) => s.step === r.step)?.title ?? 'Sin paso'}</span>
              <span className="num shrink-0">
                {r.done}/{CRM_STEPS.length}
              </span>
            </div>
            <ProgressBar value={r.done} max={CRM_STEPS.length} size="sm" label="Avance en el CRM" />
          </div>
          {next && (
            <div className={cx('flex items-start gap-1.5 text-xs', r.late ? 'font-semibold text-rojo' : 'text-ink2')}>
              <Clock className="mt-px size-3.5 shrink-0" aria-hidden />
              <span>
                {next.text}
                {next.on && ` · ${fmtDate(next.on)}`}
              </span>
            </div>
          )}
        </div>
      )}
      {(r.flags.length > 0 || (age != null && p.stage !== 'client')) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {r.flags.map((x) => (
            <Badge key={x} tone="amber" icon={x.startsWith('Puerta') ? <DoorOpen /> : <ShieldCheck />}>
              {x}
            </Badge>
          ))}
          {age != null && p.stage !== 'client' && <span className="ml-auto text-[11px] text-muted">{age === 0 ? 'hoy' : `hace ${age} d`}</span>}
        </div>
      )}
    </div>
  )
}

function NewProspect({ close, save }: { close: () => void; save: (p: Prospect) => Promise<Prospect> }) {
  const [d, setD] = useState(blankProspect)
  const saver = useSaver()
  const navigate = useNavigate()
  const set = <K extends keyof Prospect>(k: K, v: Prospect[K]) => setD((x) => ({ ...x, [k]: v }))
  const size = companySize(d.companyEmployees)
  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!d.company.trim()) return saver.setError('Escribe el nombre de la empresa.')
    const ok = await saver.run(async () => {
      const saved = await save(d)
      navigate(`/crm/${saved.id}`)
    })
    if (ok) close()
  }
  return (
    <Drawer
      open
      onClose={close}
      title="Nuevo prospecto"
      subtitle="Prospecto inicial: después se programa la junta de descubrimiento"
      footer={
        <div className="flex gap-2">
          <Button variant="primary" icon={<Plus />} loading={saver.busy} onClick={() => void submit()}>
            Dar de alta
          </Button>
          <Button onClick={close}>Cancelar</Button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        {saver.error && <Notice tone="error">{saver.error}</Notice>}
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Empresa</h3>
          <FormGrid>
            <TextField className="sm:col-span-2" label="Empresa" value={d.company} onChange={(v) => set('company', v)} required />
            <TextField label="Giro" value={d.industry ?? ''} onChange={(v) => set('industry', v)} />
            <TextField label="De dónde llegó" value={d.source} onChange={(v) => set('source', v)} />
          </FormGrid>
        </section>
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Contacto</h3>
          <FormGrid>
            <TextField label="Contacto" value={d.contactName} onChange={(v) => set('contactName', v)} />
            <TextField label="Puesto" value={d.contactRole} onChange={(v) => set('contactRole', v)} />
            <TextField label="Correo" value={d.contactEmail ?? ''} onChange={(v) => set('contactEmail', v.trim())} />
            <TextField label="Teléfono o WhatsApp" value={d.contactPhone ?? ''} onChange={(v) => set('contactPhone', v)} />
          </FormGrid>
        </section>
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Tamaño</h3>
          <FormGrid>
            <NumberField label="Empleados de la empresa" help={size ? `Empresa ${COMPANY_SIZE[size].toLowerCase()}` : undefined} value={d.companyEmployees ?? null} onChange={(v) => set('companyEmployees', v)} />
            <NumberField label="Empleados que usarían el sistema" value={d.projectUsers ?? null} onChange={(v) => set('projectUsers', v)} />
          </FormGrid>
        </section>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  )
}
