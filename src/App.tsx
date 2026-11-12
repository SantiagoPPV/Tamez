import type { ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router'
import { useSession } from './app/session'
import { Button, cx, Notice, Spinner } from './ui/kit'
import { Login } from './pages/Login'
import { Projects } from './pages/Projects'
import { ProspectsPage } from './pages/Prospects'
import { ProposalPage } from './pages/Proposal'
import { EstimatesPage } from './pages/Estimates'
import { FirmPage } from './pages/Firm'
import { PortalHome, PortalPage } from './pages/Portal'
import { ProjectLayout } from './pages/project/ProjectLayout'
import { Dashboard } from './pages/project/Dashboard'
import { WbsPage } from './pages/project/Wbs'
import { WorkLogPage } from './pages/project/WorkLogPage'
import { ChangesPage } from './pages/project/Changes'
import { RisksPage } from './pages/project/Risks'
import { PendingsPage } from './pages/project/Pendings'
import { DecisionsPage } from './pages/project/Decisions'
import { BillingPage } from './pages/project/Billing'
import { WeeksPage } from './pages/project/Weeks'
import { SettingsPage } from './pages/project/Settings'
import { GatesPage } from './pages/project/Gates'
import { DocumentEditor, DocumentsPage } from './pages/project/Documents'
import { ServicePage } from './pages/project/Service'
import { PrintView } from './pages/project/PrintView'

const NOT_FOUND = (
  <div className="px-4 py-16 text-center">
    <p className="mb-4 text-muted">Esa página no existe.</p>
    <Link className="font-semibold text-accent" to="/">
      Ir al inicio
    </Link>
  </div>
)

export default function App() {
  const { session, isDemo, signOut, leaveDemo, enterDemo } = useSession()

  if (session.status === 'loading') return <Spinner />
  if (session.status === 'signedOut') return <Login error={session.error} />
  if (session.status === 'notStaff' || session.status === 'noSchema')
    return (
      <Shell>
        <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
          {session.status === 'notStaff' ? (
            <Notice tone="warn">
              <p className="font-semibold">Tu usuario todavía no tiene acceso.</p>
              <p className="mt-1">
                Si eres socio, quien administra la base agrega este identificador a la tabla <code>sam_staff</code>. Si eres cliente, pide al despacho que te dé
                acceso al portal de tu proyecto con este identificador:
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
        </div>
      </Shell>
    )

  if (session.status === 'client')
    return (
      <Shell
        right={
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Salir
          </Button>
        }
      >
        <Routes>
          <Route path="/portal" element={<PortalHome />} />
          <Route path="/portal/:projectId" element={<PortalPage />} />
          <Route path="*" element={<Navigate to={session.projects.length === 1 ? `/portal/${session.projects[0].id}` : '/portal'} replace />} />
        </Routes>
      </Shell>
    )

  return (
    <Shell
      nav
      right={
        isDemo ? (
          <Button variant="ghost" size="sm" onClick={leaveDemo}>
            Salir<span className="hidden sm:inline"> de la demostración</span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Salir
          </Button>
        )
      }
      demo={isDemo}
    >
      <Routes>
        <Route path="/" element={<Projects />} />
        <Route path="/prospectos" element={<ProspectsPage />} />
        <Route path="/prospectos/:prospectId/:proposalId" element={<ProposalPage />} />
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
          <Route path="proyecto" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={NOT_FOUND} />
      </Routes>
    </Shell>
  )
}

const MAIN_NAV = [
  { to: '/', label: 'Proyectos', end: true },
  { to: '/prospectos', label: 'Prospectos' },
  { to: '/estimaciones', label: 'Estimaciones' },
  { to: '/despacho', label: 'Despacho' },
]

function Shell({ children, right, demo, nav }: { children: ReactNode; right?: ReactNode; demo?: boolean; nav?: boolean }) {
  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-30 border-b border-rule bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-5">
            <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
              <img src="/icono.svg" alt="" className="size-7" />
              <span className="hidden truncate text-[15px] font-bold tracking-tight sm:inline">Sistemas a la medida</span>
            </Link>
            {nav && (
              <nav className="flex min-w-0 gap-1 overflow-x-auto" aria-label="Principal">
                {MAIN_NAV.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) => cx('shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap', isActive ? 'bg-accent-soft text-accent-2' : 'text-ink2 hover:bg-soft')}
                  >
                    {n.label}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {demo && (
              <span className="hidden rounded-full bg-ambar-soft px-2.5 py-0.5 text-xs font-semibold text-ambar lg:inline">Demostración: datos solo en este navegador</span>
            )}
            {right}
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
