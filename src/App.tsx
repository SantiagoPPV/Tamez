import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router'
import { BriefcaseBusiness, Building2, Calculator, LogOut, Menu, ReceiptText, Target, X } from 'lucide-react'
import { useSession } from './app/session'
import { Avatar, Badge, Button, cx, LinkButton, Notice, Spinner } from './ui/kit'
import { Login } from './pages/Login'
import { Projects } from './pages/Projects'
import { CrmBoard } from './pages/crm/CrmBoard'
import { ProspectPage } from './pages/crm/ProspectPage'
import { ProposalPage } from './pages/Proposal'
import { NotificationsBell } from './pages/Notifications'

// Lo demás se descarga al abrirse: el paquete inicial queda chico.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => lazy(() => load().then((m) => ({ default: m[name] })))
const CobranzaPage = page(() => import('./pages/Cobranza'), 'CobranzaPage')
const SharedPage = page(() => import('./pages/Shared'), 'SharedPage')
const EstimatesPage = page(() => import('./pages/Estimates'), 'EstimatesPage')
const FirmPage = page(() => import('./pages/Firm'), 'FirmPage')
const PortalHome = page(() => import('./pages/Portal'), 'PortalHome')
const PortalPage = page(() => import('./pages/Portal'), 'PortalPage')
const ProjectLayout = page(() => import('./pages/project/ProjectLayout'), 'ProjectLayout')
const Dashboard = page(() => import('./pages/project/Dashboard'), 'Dashboard')
const ProcessPage = page(() => import('./pages/project/Process'), 'ProcessPage')
const WbsPage = page(() => import('./pages/project/Wbs'), 'WbsPage')
const WorkLogPage = page(() => import('./pages/project/WorkLogPage'), 'WorkLogPage')
const ChangesPage = page(() => import('./pages/project/Changes'), 'ChangesPage')
const RisksPage = page(() => import('./pages/project/Risks'), 'RisksPage')
const PendingsPage = page(() => import('./pages/project/Pendings'), 'PendingsPage')
const DecisionsPage = page(() => import('./pages/project/Decisions'), 'DecisionsPage')
const BillingPage = page(() => import('./pages/project/Billing'), 'BillingPage')
const WeeksPage = page(() => import('./pages/project/Weeks'), 'WeeksPage')
const SettingsPage = page(() => import('./pages/project/Settings'), 'SettingsPage')
const GatesPage = page(() => import('./pages/project/Gates'), 'GatesPage')
const DocumentsPage = page(() => import('./pages/project/Documents'), 'DocumentsPage')
const DocumentEditor = page(() => import('./pages/project/Documents'), 'DocumentEditor')
const ServicePage = page(() => import('./pages/project/Service'), 'ServicePage')
const PrintView = page(() => import('./pages/project/PrintView'), 'PrintView')

const NOT_FOUND = (
  <main className="px-4 py-16 text-center">
    <p className="mb-4 text-muted">Esa página no existe.</p>
    <LinkButton to="/" variant="primary">
      Ir al inicio
    </LinkButton>
  </main>
)

export default function App() {
  const { session, isDemo, signOut, leaveDemo, enterDemo } = useSession()
  const location = useLocation()

  // Una liga compartida se abre sin sesión.
  if (location.pathname.startsWith('/compartido/'))
    return (
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/compartido/:token" element={<SharedPage />} />
        </Routes>
      </Suspense>
    )
  if (session.status === 'loading') return <Spinner />
  if (session.status === 'signedOut') return <Login error={session.error} />
  if (session.status === 'notStaff' || session.status === 'noSchema')
    return (
      <Shell right={<Button variant="ghost" size="sm" icon={<LogOut />} onClick={() => void signOut()}>Salir</Button>}>
        <main className="mx-auto max-w-xl space-y-4 px-4 py-10">
          {session.status === 'notStaff' ? (
            <Notice tone="warn" title="Tu usuario todavía no tiene acceso.">
              <p className="mt-1">
                Si eres socio, quien administra la base agrega este identificador a la tabla <code>sam_staff</code>. Si eres cliente, pide al despacho que te dé acceso al
                portal de tu proyecto con tu correo.
              </p>
              <p className="mt-2 break-all font-mono text-xs">{session.userId}</p>
              <p className="mt-1 text-xs">({session.email})</p>
            </Notice>
          ) : (
            <Notice tone="error">{session.message}</Notice>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void signOut()}>Salir</Button>
            <Button variant="primary" onClick={enterDemo}>
              Ver la demostración CE-INV
            </Button>
          </div>
        </main>
      </Shell>
    )

  if (session.status === 'client')
    return (
      <Shell
        right={
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:inline">{session.email}</span>
            <Button variant="ghost" size="sm" icon={<LogOut />} onClick={() => void signOut()}>
              Salir
            </Button>
          </div>
        }
      >
        <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/portal" element={<PortalHome />} />
          <Route path="/portal/:projectId" element={<PortalPage />} />
          <Route path="*" element={<Navigate to={session.projects.length === 1 ? `/portal/${session.projects[0].id}` : '/portal'} replace />} />
        </Routes>
        </Suspense>
      </Shell>
    )

  const user = session.status === 'ready' ? { name: session.name ?? (isDemo ? 'Demostración' : null), email: session.email, isAdmin: session.isAdmin } : null
  return (
    <Shell nav demo={isDemo} user={user} onSignOut={isDemo ? leaveDemo : () => void signOut()} right={<NotificationsBell />}>
      <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<Projects />} />
        <Route path="/crm" element={<CrmBoard />} />
        <Route path="/crm/:prospectId" element={<ProspectPage />} />
        <Route path="/crm/:prospectId/propuesta/:proposalId" element={<ProposalPage />} />
        <Route path="/cobranza" element={<CobranzaPage />} />
        <Route path="/prospectos" element={<Navigate to="/crm" replace />} />
        <Route path="/prospectos/:prospectId/:proposalId" element={<LegacyProposal />} />
        <Route path="/estimaciones" element={<EstimatesPage />} />
        <Route path="/despacho" element={<FirmPage />} />
        <Route path="/portal/:projectId" element={<PortalPage />} />
        <Route path="/p/:projectId" element={<ProjectLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="desglose" element={<WbsPage />} />
          <Route path="bitacora" element={<WorkLogPage />} />
          <Route path="cambios" element={<ChangesPage />} />
          <Route path="riesgos" element={<RisksPage />} />
          <Route path="pendientes" element={<PendingsPage />} />
          <Route path="decisiones" element={<DecisionsPage />} />
          <Route path="cobranza" element={<BillingPage />} />
          <Route path="semanas" element={<WeeksPage />} />
          <Route path="puertas" element={<GatesPage />} />
          <Route path="documentos" element={<DocumentsPage />} />
          <Route path="documentos/:docId" element={<DocumentEditor />} />
          <Route path="imprimir/:what" element={<PrintView />} />
          <Route path="servicio" element={<ServicePage />} />
          <Route path="proceso" element={<ProcessPage />} />
          <Route path="proyecto" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={NOT_FOUND} />
      </Routes>
      </Suspense>
    </Shell>
  )
}

interface NavItem {
  to: string
  label: string
  hint: string
  icon: ComponentType<{ className?: string }>
  match: (path: string) => boolean
}
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Comercial', items: [{ to: '/crm', label: 'CRM', hint: 'Prospectos y ventas', icon: Target, match: (p) => p.startsWith('/crm') || p.startsWith('/prospectos') }] },
  {
    group: 'Operación',
    items: [
      { to: '/', label: 'Operaciones', hint: 'Proyectos de los clientes', icon: BriefcaseBusiness, match: (p) => p === '/' || p.startsWith('/p/') || p.startsWith('/portal') },
      { to: '/cobranza', label: 'Cobranza', hint: 'Facturas y cobros', icon: ReceiptText, match: (p) => p.startsWith('/cobranza') },
    ],
  },
  {
    group: 'Despacho',
    items: [
      { to: '/estimaciones', label: 'Estimaciones', hint: 'Desgloses tipo y horas base', icon: Calculator, match: (p) => p.startsWith('/estimaciones') },
      { to: '/despacho', label: 'Despacho', hint: 'Datos, formatos e integraciones', icon: Building2, match: (p) => p.startsWith('/despacho') },
    ],
  },
]
const ALL_ITEMS = NAV.flatMap((g) => g.items)

/** Las ligas viejas de propuestas llevan ahora al CRM. */
function LegacyProposal() {
  const { prospectId = '', proposalId = '' } = useParams()
  return <Navigate to={`/crm/${prospectId}/propuesta/${proposalId}`} replace />
}

interface ShellUser {
  name: string | null
  email: string | null
  isAdmin: boolean
}

function Brand({ onNavy }: { onNavy?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5">
      <span className={cx('grid size-8 shrink-0 place-items-center rounded-lg', onNavy ? 'bg-white' : 'bg-accent')}>
        <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
          <path d="M9 21.5h14M9 16h9M9 10.5h14" stroke={onNavy ? '#1D3A6E' : '#fff'} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </svg>
      </span>
      <span className="min-w-0 leading-tight">
        <span className={cx('block truncate text-[15px] font-bold tracking-tight', onNavy ? 'text-white' : 'text-ink')}>Sistemas a la medida</span>
        <span className={cx('truncate text-[11px] font-medium', onNavy ? 'block text-white/55' : 'hidden text-muted sm:block')}>Control de proyectos</span>
      </span>
    </Link>
  )
}

function Sidebar({ user, demo, onSignOut, onClose }: { user: ShellUser | null; demo?: boolean; onSignOut?: () => void; onClose?: () => void }) {
  const { pathname } = useLocation()
  return (
    <div className="sobre-navy flex h-full flex-col bg-navy text-white">
      <div className="flex h-16 items-center justify-between gap-2 px-5">
        <Brand onNavy />
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Cerrar el menú">
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>
      <nav className="scroll-fino flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Principal">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{g.group}</div>
            <ul className="space-y-1">
              {g.items.map((n) => {
                const on = n.match(pathname)
                const Icon = n.icon
                return (
                  <li key={n.to}>
                    <Link
                      to={n.to}
                      aria-current={on ? 'page' : undefined}
                      className={cx(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                        on ? 'bg-white/[0.12] text-white' : 'text-white/70 hover:bg-white/[0.06] hover:text-white',
                      )}
                    >
                      {on && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-white" aria-hidden />}
                      <Icon className={cx('size-[18px] shrink-0', on ? 'text-white' : 'text-white/60 group-hover:text-white')} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{n.label}</span>
                        <span className={cx('block truncate text-[11px]', on ? 'text-white/65' : 'text-white/40')}>{n.hint}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        {demo && <div className="mb-3 rounded-lg bg-white/[0.08] px-3 py-2 text-xs text-white/75">Modo demostración: los datos viven solo en este navegador.</div>}
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <Avatar name={user?.name ?? user?.email ?? 'Socio'} tone="white" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user?.name ?? 'Socio del despacho'}</div>
            <div className="truncate text-[11px] text-white/55">{user?.isAdmin ? 'Administrador' : (user?.email ?? 'Despacho')}</div>
          </div>
          {onSignOut && (
            <button type="button" onClick={onSignOut} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label={demo ? 'Salir de la demostración' : 'Salir'} title={demo ? 'Salir de la demostración' : 'Salir'}>
              <LogOut className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Shell({
  children,
  right,
  demo,
  nav,
  user,
  onSignOut,
}: {
  children: ReactNode
  right?: ReactNode
  demo?: boolean
  nav?: boolean
  user?: ShellUser | null
  onSignOut?: () => void
}) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  const section = ALL_ITEMS.find((n) => n.match(pathname))
  return (
    <div className="min-h-dvh">
      {nav && (
        <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
          <Sidebar user={user ?? null} demo={demo} onSignOut={onSignOut} />
        </aside>
      )}
      {nav && open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 animate-entra bg-navy/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative h-full w-72 max-w-[85%] animate-entra shadow-pop">
            <Sidebar user={user ?? null} demo={demo} onSignOut={onSignOut} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className={cx(nav && 'lg:pl-64')}>
        <header className="no-print sticky top-0 z-30 border-b border-rule bg-white/90 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
            {nav && (
              <button type="button" className="-ml-1 rounded-lg p-2 text-ink2 hover:bg-soft lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir el menú">
                <Menu className="size-5" aria-hidden />
              </button>
            )}
            <div className={cx('min-w-0', nav && 'lg:hidden')}>
              <Brand />
            </div>
            {nav && section && (
              <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
                <section.icon className="size-4 text-accent" />
                <span className="font-semibold text-ink">{section.label}</span>
                <span className="text-muted">· {section.hint}</span>
              </div>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {demo && (
                <span className="hidden sm:block">
                  <Badge tone="amber" dot>
                    Demostración
                  </Badge>
                </span>
              )}
              {right}
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
