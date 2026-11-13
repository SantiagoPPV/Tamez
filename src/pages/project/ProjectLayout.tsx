import { Link, NavLink, Outlet, useParams } from 'react-router'
import { useProject } from '../../app/useProject'
import { PROJECT_STAGE } from '../../domain/catalogs'
import { fmtDate } from '../../domain/format'
import { effectiveStage } from '../../domain/stage'
import { cx, LightBadge, Notice, Spinner } from '../../ui/kit'

const TABS = [
  { to: '', label: 'Tablero', end: true },
  { to: 'proceso', label: 'Proceso' },
  { to: 'desglose', label: 'Desglose' },
  { to: 'bitacora', label: 'Bitácora' },
  { to: 'cambios', label: 'Cambios' },
  { to: 'riesgos', label: 'Riesgos' },
  { to: 'pendientes', label: 'Pendientes' },
  { to: 'decisiones', label: 'Decisiones' },
  { to: 'cobranza', label: 'Cobranza' },
  { to: 'semanas', label: 'Semanas' },
  { to: 'puertas', label: 'Puertas' },
  { to: 'documentos', label: 'Documentos' },
  { to: 'servicio', label: 'Servicio' },
  { to: 'proyecto', label: 'Proyecto' },
]

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
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-wider text-accent">{project.key}</div>
              <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{project.name || 'Sin nombre'}</h1>
              <div className="text-sm text-muted">
                {project.client}
                <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-2">{PROJECT_STAGE[effectiveStage(api.data)]}</span>
                {project.prospectId && (
                  <Link to={`/crm/${project.prospectId}`} className="ml-2 text-xs font-semibold text-accent">
                    Ver en el CRM
                  </Link>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end sm:text-right">
              <LightBadge light={r.generalLight} size="lg" />
              <div className="text-xs text-muted">
                Al corte del <span className="num font-semibold text-ink2">{fmtDate(r.cutoff)}</span>
                {!project.cutoffDate && ' (hoy)'}
              </div>
            </div>
          </div>
          <nav className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4" aria-label="Secciones del proyecto">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cx(
                    'relative shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap',
                    isActive ? 'border-accent text-accent' : 'border-transparent text-ink2 hover:text-ink',
                  )
                }
              >
                {t.label}
                {counts[t.to] ? (
                  <span className="ml-1.5 rounded-full bg-rojo-soft px-1.5 py-0.5 text-[11px] font-bold text-rojo">{counts[t.to]}</span>
                ) : null}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
        <Outlet context={api} />
      </main>
    </div>
  )
}
