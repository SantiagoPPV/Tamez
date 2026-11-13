import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DemoRepository } from '../data/demoRepo'
import { DataError, type ProjectSummary, type Repository } from '../data/repository'
import { getSupabase, supabaseConfigured } from '../data/supabase'
import { SupabaseRepository } from '../data/supabaseRepo'

export type Session =
  | { status: 'loading' }
  | { status: 'signedOut'; error?: string }
  | { status: 'notStaff'; userId: string; email: string }
  | { status: 'noSchema'; message: string }
  /** Socio del despacho */
  | { status: 'ready'; repo: Repository; userId: string | null; email: string | null; isAdmin: boolean; name: string | null }
  /** Usuario del cliente: solo el portal de sus proyectos */
  | { status: 'client'; repo: Repository; userId: string; email: string; projects: ProjectSummary[] }

interface SessionApi {
  session: Session
  isDemo: boolean
  signIn: (email: string, password: string) => Promise<void>
  /** Entrada sin contraseña: Supabase manda un enlace al correo (clientes del portal). */
  sendMagicLink: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
  enterDemo: () => void
  leaveDemo: () => void
}

const Ctx = createContext<SessionApi | null>(null)
const MODE_KEY = 'sam-mode'

function storedDemo(): boolean {
  try {
    return sessionStorage.getItem(MODE_KEY) === 'demo'
  } catch {
    return false
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(() => !supabaseConfigured || storedDemo())
  const [session, setSession] = useState<Session>({ status: 'loading' })

  const resolveUser = useCallback(async (user: { id: string; email?: string } | null) => {
    const db = getSupabase()
    if (!db || !user) {
      setSession({ status: 'signedOut' })
      return
    }
    const repo = new SupabaseRepository(db)
    try {
      const me = await repo.whoAmI()
      if (me.staff) {
        setSession({ status: 'ready', repo, userId: user.id, email: user.email ?? null, isAdmin: me.isAdmin, name: me.name })
        return
      }
      const projects = await repo.portalProjects().catch(() => [])
      if (projects.length) setSession({ status: 'client', repo, userId: user.id, email: user.email ?? '', projects })
      else setSession({ status: 'notStaff', userId: user.id, email: user.email ?? '' })
    } catch (e) {
      if (e instanceof DataError && e.code === 'missing_schema') setSession({ status: 'noSchema', message: e.message })
      else setSession({ status: 'signedOut', error: e instanceof Error ? e.message : String(e) })
    }
  }, [])

  useEffect(() => {
    if (demo) {
      setSession({ status: 'ready', repo: new DemoRepository(), userId: null, email: null, isAdmin: true, name: null })
      return
    }
    const db = getSupabase()!
    let alive = true
    void db.auth.getSession().then(({ data }) => {
      if (alive) void resolveUser(data.session?.user ?? null)
    })
    const { data: sub } = db.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void resolveUser(s?.user ?? null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [demo, resolveUser])

  const api = useMemo<SessionApi>(
    () => ({
      session,
      isDemo: demo,
      async signIn(email, password) {
        const db = getSupabase()
        if (!db) return
        const { error } = await db.auth.signInWithPassword({ email, password })
        if (error)
          setSession({
            status: 'signedOut',
            error: error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message,
          })
      },
      async sendMagicLink(email) {
        const db = getSupabase()
        if (!db) return 'Sin base de datos conectada: entra a la demostración.'
        const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/portal`, shouldCreateUser: true } })
        if (!error) return null
        if (error.status === 429) return 'Se mandaron demasiados enlaces: espera unos minutos.'
        // Con los registros abiertos apagados, solo entra quien el despacho ya dio de alta.
        if (error.code === 'otp_disabled' || error.code === 'signup_disabled' || /signups? not allowed/i.test(error.message))
          return 'Ese correo todavía no tiene acceso: pide al despacho que te dé de alta en el portal.'
        if ((error.status ?? 0) >= 500) return 'No se pudo enviar el correo de acceso. Intenta más tarde o avisa al despacho.'
        return error.message
      },
      async signOut() {
        await getSupabase()?.auth.signOut()
        setSession({ status: 'signedOut' })
      },
      enterDemo() {
        try {
          sessionStorage.setItem(MODE_KEY, 'demo')
        } catch {
          /* sin almacenamiento */
        }
        setDemo(true)
      },
      leaveDemo() {
        try {
          sessionStorage.removeItem(MODE_KEY)
        } catch {
          /* sin almacenamiento */
        }
        if (supabaseConfigured) {
          setSession({ status: 'loading' })
          setDemo(false)
        }
      },
    }),
    [session, demo],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useSession(): SessionApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSession fuera de SessionProvider')
  return v
}

/** El repositorio de la sesión (socio o cliente). */
export function useRepo(): Repository {
  const { session } = useSession()
  if (session.status !== 'ready' && session.status !== 'client') throw new Error('Sin sesión')
  return session.repo
}

/** Permisos: las puertas, la tabla de horas base y los parámetros los aprueba un administrador (Santiago). */
export function useCan() {
  const { session } = useSession()
  const isAdmin = session.status === 'ready' && session.isAdmin
  return { approveGates: isAdmin, approveBaseHours: isAdmin, isStaff: session.status === 'ready' }
}
