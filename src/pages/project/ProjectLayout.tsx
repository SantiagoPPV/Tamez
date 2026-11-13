import { Link, NavLink, Outlet, useParams } from 'react-router'
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarRange,
  ClipboardList,
  DoorOpen,
  FileText,
  Gauge,
  GitPullRequestArrow,
  LifeBuoy,
  ListTree,
  NotebookPen,
  ReceiptText,
  Scale,
  Settings2,
  ShieldAlert,
  Target,
  Workflow,
} from 'lucide-react'
import { useProject } from '../../app/useProject'
import { PROJECT_STAGE } from '../../domain/catalogs'
import { fmtDate, fmtPct } from '../../domain/format'
import { effectiveStage } from '../../domain/stage'
import type { ProjectStage } from '../../domain/types'
import { Badge, cx, LightBadge, Notice, ProgressBar, Spinner, type Tone } from '../../ui/kit'

const TABS = [
  { to: '', label: 'Tablero', end: true, icon: Gauge },
  { to: 'proceso', label: 'Proceso', icon: Workflow },
  { to: 'desglose', label: 'Desglose', icon: ListTree },
  { to: 'bitacora', label: 'Bitácora', icon: NotebookPen },
  { to: 'cambios', label: 'Cambios', icon: GitPullRequestArrow },
  { to: 'riesgos', label: 'Riesgos', icon: ShieldAlert },
  { to: 'pendientes', label: 'Pendientes', icon: ClipboardList },
  { to: 'decisiones', label: 'Decisiones', icon: Scale },
  { to: 'cobranza', label: 'Cobranza', icon: ReceiptText },
  { to: 'semanas', label: 'Semanas', icon: CalendarRange },
  { to: 'puertas', label: 'Puertas', icon: DoorOpen },
  { to: 'documentos', label: 'Documentos', icon: FileText },
  { to: 'servicio', label: 'Servicio', icon: LifeBuoy },
  { to: 'proyecto', label: 'Proyecto', icon: Settings2 },
]

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

export function ProjectLayout() {
  const { projectId = '' } = useParams()
  const { api, error } = useProject(projectId)

  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Notice tone="error">{error}</Notice>
      </div>
    )
  if (!api) return <Spinner />

  const { project } = api.data
  const r = api.result
  const stage = effectiveStage(api.data)
  const progress = r.budget.plannedHours ? r.figures.earned / r.budget.plannedHours : null
  const counts: Record<string, number> = {
    desglose: [...r.wbs.values()].filter((w) => w.alert).length + [...r.milestones.values()].filter((m) => m.alert).length,
    bitacora: [...r.workLogs.values()].filter((w) => w.alert).length,
    cambios: [...r.changes.values()].filter((c) => c.alert).length,
    riesgos: [...r.risks.values()].filter((c) => c.alert).length,
    pendientes: [...r.pendings.values()].filter((p) => p.overdueAtCutoff === 1).length,
  }

  return (
    <div>
      <div className="no-print border-b border-rule bg-white">
        <div className="mx-auto max-w-[90rem] px-4 pt-5 sm:px-6 lg:px-8">
          <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-2">
            <ArrowLeft className="size-4" aria-hidden />
            Operaciones
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-bold tracking-[0.14em] text-accent">{project.key}</div>
              <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">{project.name || 'Sin nombre'}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>{project.client}</span>
                <Badge tone={STAGE_TONE[stage]}>{PROJECT_STAGE[stage]}</Badge>
                {project.prospectId && (
                  <Link to={`/crm/${project.prospectId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    <Target className="size-3.5" aria-hidden />
                    Ver en el CRM
                  </Link>
                )}
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-4 sm:w-auto">
              <div className="min-w-[11rem] flex-1 sm:flex-none">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-ink2">
                    <BookOpenCheck className="mr-1 inline size-3.5 text-accent" aria-hidden />
                    Avance ganado
                  </span>
                  <span className="num font-semibold text-ink">{progress == null ? '—' : fmtPct(progress)}</span>
                </div>
                <ProgressBar value={progress ?? 0} label="Avance ganado" tone={r.generalLight === 'red' ? 'red' : r.generalLight === 'yellow' ? 'amber' : 'navy'} />
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <LightBadge light={r.generalLight} size="lg" />
                <div className="text-xs text-muted">
                  Al corte del <span className="num font-semibold text-ink2">{fmtDate(r.cutoff)}</span>
                  {!project.cutoffDate && ' (hoy)'}
                </div>
              </div>
            </div>
          </div>
          <nav className="scroll-fino -mx-4 mt-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Secciones del proyecto">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cx(
                      'group relative inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
                      isActive ? 'border-accent text-accent' : 'border-transparent text-ink2 hover:border-rule hover:text-ink',
                    )
                  }
                >
                  <Icon className="size-4 opacity-80" aria-hidden />
                  {t.label}
                  {counts[t.to] ? <span className="num rounded-full bg-rojo-soft px-1.5 py-0.5 text-[11px] font-bold text-rojo">{counts[t.to]}</span> : null}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-[90rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <Outlet context={api} />
      </main>
    </div>
  )
}
