import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { BriefcaseBusiness, CalendarClock, CircleAlert, Flag, FolderPlus, Plus, ReceiptText, RotateCcw, Search, TriangleAlert } from 'lucide-react'
import { useRepo, useSession } from '../app/session'
import { DemoRepository } from '../data/demoRepo'
import type { ProjectSummary } from '../data/repository'
import { emptyProject } from '../domain/factory'
import { PROJECT_STAGE } from '../domain/catalogs'
import { computeControl } from '../domain/control'
import { effectiveStage } from '../domain/stage'
import { freezeSent } from '../docs/autofill'
import { fmtDate, fmtMoney, fmtPct } from '../domain/format'
import type { Light, ProjectData, ProjectStage } from '../domain/types'
import { fieldClass, TextField } from '../ui/fields'
import { Badge, Button, cx, Drawer, EmptyState, KpiCard, LightBadge, Notice, PageHeader, ProgressBar, Segmented, Skeleton, Spinner, type Tone } from '../ui/kit'

/** En Operaciones: todo menos los expedientes que esperan su pago inicial (siguen en el CRM). */
const inOps = (p: ProjectSummary) => p.stage !== 'confirmed'

const STAGE_TONE: Record<ProjectStage, Tone> = {
  confirmed: 'gray',
  start: 'navy',
  planning: 'navy',
  execution: 'solid',
  closing: 'amber',
  service: 'green',
  closed: 'gray',
  cancelled: 'red',
}
type Filter = 'all' | 'start' | 'planning' | 'execution' | 'closing' | 'service' | 'closed'
const FILTERS: { value: Filter; label: string; match: (s: ProjectStage | null) => boolean }[] = [
  { value: 'all', label: 'Todos', match: () => true },
  { value: 'start', label: 'Inicio', match: (s) => s === 'start' },
  { value: 'planning', label: 'Planeación', match: (s) => s === 'planning' },
  { value: 'execution', label: 'Ejecución', match: (s) => s === 'execution' || s == null },
  { value: 'closing', label: 'Cierre', match: (s) => s === 'closing' },
  { value: 'service', label: 'Servicio', match: (s) => s === 'service' },
  { value: 'closed', label: 'Cerrados', match: (s) => s === 'closed' || s === 'cancelled' },
]

/** Lo que se ve de un proyecto en la lista. */
interface Health {
  stage: ProjectStage
  light: Light
  progress: number | null
  receivable: number
  overdue: number
  nextMilestone: { name: string; on: string | null } | null
  marginPct: number | null
}

function health(d: ProjectData): Health {
  const r = computeControl(d)
  const open = [...d.milestones].filter((m) => !m.actaDate).sort((a, b) => (a.plannedDelivery ?? '9').localeCompare(b.plannedDelivery ?? '9'))[0]
  return {
    stage: effectiveStage(d),
    light: r.generalLight,
    progress: r.budget.plannedHours ? r.figures.earned / r.budget.plannedHours : null,
    receivable: r.billing.receivable,
    overdue: r.billing.overdueInvoices,
    nextMilestone: open ? { name: `${open.key} · ${open.title}`, on: open.forecastDelivery ?? open.plannedDelivery } : null,
    marginPct: r.tracking.projectedMarginPct,
  }
}

export function Projects() {
  const repo = useRepo()
  const { isDemo } = useSession()
  const navigate = useNavigate()
  const [list, setList] = useState<ProjectSummary[] | null>(null)
  const [stats, setStats] = useState<Record<string, Health> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    try {
      setList(await repo.listProjects())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    // Los indicadores llegan después: la lista aparece de inmediato.
    try {
      const all = await repo.loadAllProjects()
      setStats(Object.fromEntries(all.map((d) => [d.project.id, health(d)])))
    } catch {
      setStats({})
    }
  }, [repo])
  useEffect(() => {
    void load()
  }, [load])

  async function loadExample() {
    setBusy(true)
    setError(null)
    try {
      const { buildCeInv, buildDemoProposals, buildDemoProspects, DEMO_FIRM } = await import('../data/ceinv')
      const firm = await repo.getFirm().catch(() => DEMO_FIRM)
      const data = freezeSent({ data: buildCeInv(), firm: firm.supportEmail ? firm : DEMO_FIRM, proposals: buildDemoProposals(), prospects: buildDemoProspects() })
      const id = await repo.createProject(data)
      navigate(`/p/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const ops = useMemo(() => (list ?? []).filter(inOps), [list])
  const stageOf = (p: ProjectSummary): ProjectStage | null => stats?.[p.id]?.stage ?? p.stage ?? null
  const term = q.trim().toLowerCase()
  const shown = ops.filter((p) => FILTERS.find((f) => f.value === filter)!.match(stageOf(p)) && (!term || `${p.key} ${p.name} ${p.client}`.toLowerCase().includes(term)))
  const pending = (list ?? []).filter((p) => p.stage === 'confirmed')
  const values = Object.values(stats ?? {})
  const activeCount = ops.filter((p) => !['closed', 'cancelled'].includes(stageOf(p) ?? '')).length
  const attention = values.filter((h) => h.light === 'red' || h.light === 'yellow').length
  const receivable = values.reduce((s, h) => s + h.receivable, 0)
  const overdue = values.reduce((s, h) => s + h.overdue, 0)

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Operaciones"
        title="Proyectos de los clientes"
        subtitle="El único lugar donde vive un proyecto: llega del CRM al cobrarse el pago inicial, con todos sus datos, y de él salen los documentos, los reportes y los indicadores."
        actions={
          <Button variant="primary" icon={<FolderPlus />} onClick={() => setCreating(true)}>
            Nuevo proyecto
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Proyectos activos" value={list ? activeCount : '—'} hint={`${ops.length} en Operaciones`} icon={<BriefcaseBusiness />} />
        <KpiCard label="Piden atención" value={stats ? attention : '—'} hint="Semáforo general en amarillo o rojo" icon={<TriangleAlert />} tone="amber" alert={attention > 0} />
        <KpiCard label="Por cobrar" value={stats ? fmtMoney(receivable) : '—'} hint="Facturado y no cobrado" icon={<ReceiptText />} />
        <KpiCard label="Facturas vencidas" value={stats ? overdue : '—'} hint="Pasaron sus días de crédito" icon={<CircleAlert />} tone="red" alert={overdue > 0} />
      </div>

      {pending.length > 0 && (
        <div className="mb-5">
          <Notice
            tone="info"
            title={`${pending.length} expediente${pending.length === 1 ? '' : 's'} por arrancar`}
            action={
              <Link to="/crm" className="text-sm font-semibold text-accent hover:underline">
                Ver en el CRM
              </Link>
            }
          >
            Esperan su pago inicial: al cobrarse aparecen aquí como «Cliente en Inicio».
          </Notice>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar proyectos</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className={cx(fieldClass, 'pl-9')} placeholder="Buscar clave, proyecto o cliente" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Segmented
          label="Etapa"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({ value: f.value, label: f.label, count: f.value === 'all' ? ops.length : ops.filter((p) => f.match(stageOf(p))).length }))}
        />
      </div>

      {!list ? (
        <Spinner />
      ) : ops.length === 0 ? (
        <EmptyState
          icon={<BriefcaseBusiness />}
          title="Todavía no hay proyectos en Operaciones"
          action={
            <Button onClick={loadExample} loading={busy}>
              Cargar el caso de ejemplo CE-INV
            </Button>
          }
        >
          Llegan solos del CRM al cobrarse el pago inicial. También puedes crear uno en blanco o cargar el caso de ejemplo.
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState icon={<Search />} title="Ningún proyecto coincide">
          Cambia la búsqueda o el filtro de etapa.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id}>
              <ProjectCard p={p} h={stats ? (stats[p.id] ?? null) : undefined} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-rule pt-5 text-sm text-muted">
        {list && list.length > 0 && !list.some((p) => p.key === 'CE-INV') && (
          <Button variant="ghost" size="sm" onClick={loadExample} loading={busy}>
            Cargar el caso de ejemplo CE-INV
          </Button>
        )}
        {isDemo && (
          <>
            <span>Estás en modo demostración: lo que captures se guarda solo en este navegador.</span>
            <Button
              size="sm"
              variant="ghost"
              icon={<RotateCcw />}
              onClick={() => {
                DemoRepository.reset()
                window.location.assign('/')
              }}
            >
              Volver a los datos originales de CE-INV
            </Button>
          </>
        )}
      </div>

      <NewProject
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (key, name, client) => {
          const id = await repo.createProject(emptyProject({ key, name, client }))
          navigate(`/p/${id}/proyecto`)
        }}
      />
    </main>
  )
}

/** `h` undefined = indicadores cargando; null = no se pudieron calcular. */
function ProjectCard({ p, h }: { p: ProjectSummary; h: Health | null | undefined }) {
  const stage = h?.stage ?? p.stage ?? null
  return (
    <Link
      to={`/p/${p.id}`}
      className="flex h-full flex-col rounded-xl border border-rule bg-white p-5 shadow-card transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-accent-mid hover:shadow-pop"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-[0.12em] text-accent">{p.key}</div>
          <div className="mt-0.5 text-base leading-snug font-bold text-ink">{p.name || 'Sin nombre'}</div>
          <div className="truncate text-sm text-muted">{p.client}</div>
        </div>
        {stage && <Badge tone={STAGE_TONE[stage]}>{PROJECT_STAGE[stage]}</Badge>}
      </div>

      <div className="mt-4 flex-1 space-y-3">
        {h === undefined ? (
          <>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </>
        ) : h ? (
          <>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-ink2">Avance ganado</span>
                <span className="num font-semibold text-ink">{h.progress == null ? 'Sin plan' : fmtPct(h.progress)}</span>
              </div>
              <ProgressBar value={h.progress ?? 0} label="Avance ganado" tone={h.light === 'red' ? 'red' : h.light === 'yellow' ? 'amber' : 'navy'} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LightBadge light={h.light} size="sm" />
              {h.marginPct != null && <Badge tone="gray">Margen proyectado {fmtPct(h.marginPct)}</Badge>}
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-4 grid gap-1.5 border-t border-rule pt-3 text-xs text-ink2">
        {h?.nextMilestone && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Flag className="size-3.5 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 truncate">
              {h.nextMilestone.name}
              {h.nextMilestone.on && <span className="text-muted"> · {fmtDate(h.nextMilestone.on)}</span>}
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <ReceiptText className="size-3.5 text-accent" aria-hidden />
            {h ? (h.receivable > 0 ? `${fmtMoney(h.receivable)} por cobrar` : 'Nada por cobrar') : 'Cobranza'}
          </span>
          {h && h.overdue > 0 && (
            <Badge tone="red" icon={<CircleAlert />}>
              {h.overdue} vencida{h.overdue === 1 ? '' : 's'}
            </Badge>
          )}
          {p.cutoffDate && (
            <span className="flex items-center gap-1 text-muted">
              <CalendarClock className="size-3.5" aria-hidden />
              Corte {fmtDate(p.cutoffDate)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function NewProject({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (key: string, name: string, client: string) => Promise<void> }) {
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!key.trim()) return setError('La clave es obligatoria (por ejemplo, CE-INV).')
    setBusy(true)
    try {
      await onCreate(key.trim().toUpperCase(), name.trim(), client.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nuevo proyecto"
      subtitle="Lo normal es que llegue del CRM; en blanco nace con los valores iniciales de la minuta"
      footer={
        <div className="flex gap-2">
          <Button variant="primary" icon={<Plus />} loading={busy} onClick={() => void submit()}>
            Crear y llenar sus parámetros
          </Button>
          <Button onClick={onClose}>Cancelar</Button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <TextField label="Clave" help="Corta y única; va en los folios y en los nombres de archivo." value={key} onChange={setKey} required />
        <TextField label="Nombre del proyecto" value={name} onChange={setName} />
        <TextField label="Cliente" help="Razón social del cliente." value={client} onChange={setClient} />
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  )
}
