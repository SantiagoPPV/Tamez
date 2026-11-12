import { Link, Route, Routes } from 'react-router'
import { useSession } from './app/session'
import { Button, Notice, Spinner } from './ui/kit'
import { Login } from './pages/Login'
import { Projects } from './pages/Projects'
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
              <p className="font-semibold">Tu usuario todavía no está dado de alta en el despacho.</p>
              <p className="mt-1">
                Quien administra la base agrega este identificador a la tabla <code>sam_staff</code>:
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

  return (
    <Shell
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
          <Route path="proyecto" element={<SettingsPage />} />
        </Route>
        <Route
          path="*"
          element={
            <div className="px-4 py-16 text-center">
              <p className="mb-4 text-muted">Esa página no existe.</p>
              <Link className="font-semibold text-accent" to="/">
                Ir a los proyectos
              </Link>
            </div>
          }
        />
      </Routes>
    </Shell>
  )
}

function Shell({ children, right, demo }: { children: React.ReactNode; right?: React.ReactNode; demo?: boolean }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-rule bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/icono.svg" alt="" className="size-7" />
            <span className="truncate text-[15px] font-bold tracking-tight">
              Sistemas a la medida <span className="font-medium text-muted">· control</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {demo && (
              <span className="hidden rounded-full bg-ambar-soft px-2.5 py-0.5 text-xs font-semibold text-ambar sm:inline">
                Demostración: datos solo en este navegador
              </span>
            )}
            {right}
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
