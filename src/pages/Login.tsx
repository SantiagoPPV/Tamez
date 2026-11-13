import { useState, type FormEvent } from 'react'
import { BriefcaseBusiness, FileSignature, LogIn, Mail, ShieldCheck, Target } from 'lucide-react'
import { useSession } from '../app/session'
import { fieldClass, TextField } from '../ui/fields'
import { Button, cx, Notice } from '../ui/kit'

const POINTS = [
  { icon: Target, title: 'CRM de punta a punta', text: 'Del alta del prospecto al cobro del pago inicial, con su formato base en cada paso.' },
  { icon: BriefcaseBusiness, title: 'Operaciones con indicadores', text: 'Desglose, bitácora, puertas y once indicadores con semáforo.' },
  { icon: FileSignature, title: 'Documentos y firma', text: 'Se llenan con los datos del proyecto y se firman en el portal.' },
]

export function Login({ error }: { error?: string }) {
  const { signIn, sendMagicLink, enterDemo } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [client, setClient] = useState(() => window.location.pathname.startsWith('/portal'))
  const [linkSent, setLinkSent] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    if (client) {
      const err = await sendMagicLink(email.trim())
      setLinkError(err)
      if (!err) setLinkSent(email.trim())
    } else await signIn(email.trim(), password)
    setBusy(false)
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="sobre-navy relative hidden overflow-hidden bg-navy px-10 py-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-white/[0.04]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-white/[0.03]" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white">
            <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
              <path d="M9 21.5h14M9 16h9M9 10.5h14" stroke="#1D3A6E" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            </svg>
          </span>
          <div>
            <div className="text-lg font-bold tracking-tight">Sistemas a la medida</div>
            <div className="text-xs text-white/60">Control de proyectos</div>
          </div>
        </div>
        <div className="relative my-auto max-w-md py-12">
          <h2 className="text-3xl leading-tight font-bold tracking-tight">El único lugar donde vive un proyecto.</h2>
          <p className="mt-3 text-white/70">De sus datos salen los documentos, los reportes y los indicadores.</p>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-white/65">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck className="size-4" aria-hidden />
          Software interno: solo socios del despacho y clientes con acceso.
        </p>
      </section>

      <section className="flex items-center justify-center bg-white px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/icono.svg" alt="" className="size-10" />
            <div>
              <div className="text-lg font-bold tracking-tight">Sistemas a la medida</div>
              <div className="text-xs text-muted">Control de proyectos</div>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{client ? 'Portal del cliente' : 'Entrar'}</h1>
          <p className="mt-1 text-sm text-muted">{client ? 'Vean el avance de su proyecto, firmen y descarguen sus documentos.' : 'Con tu usuario de socio del despacho.'}</p>

          <div className="mt-6 mb-5 grid grid-cols-2 gap-1 rounded-lg bg-soft p-1 text-sm font-semibold" role="group" aria-label="Tipo de acceso">
            <button type="button" aria-pressed={!client} className={cx('rounded-md py-2 transition-colors', !client ? 'bg-white text-ink shadow-sm' : 'text-ink2 hover:text-ink')} onClick={() => setClient(false)}>
              Socio del despacho
            </button>
            <button type="button" aria-pressed={client} className={cx('rounded-md py-2 transition-colors', client ? 'bg-white text-ink shadow-sm' : 'text-ink2 hover:text-ink')} onClick={() => setClient(true)}>
              Cliente
            </button>
          </div>

          {client && linkSent ? (
            <Notice tone="success" title="Revisa tu correo">
              Te mandamos un enlace a {linkSent}. Ábrelo en este mismo dispositivo para entrar al portal de tu proyecto.
            </Notice>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && !client && <Notice tone="error">{error}</Notice>}
              {linkError && client && <Notice tone="error">{linkError}</Notice>}
              <TextField label="Correo" value={email} onChange={setEmail} required />
              {client ? (
                <p className="text-xs text-muted">Escribe el correo con el que el despacho te dio acceso: te llega un enlace para entrar, sin contraseña.</p>
              ) : (
                <div>
                  <label htmlFor="pw" className="mb-1.5 block text-[13px] font-semibold text-ink2">
                    Contraseña
                  </label>
                  <input id="pw" type="password" autoComplete="current-password" className={fieldClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              )}
              <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} icon={client ? <Mail /> : <LogIn />}>
                {busy ? 'Un momento…' : client ? 'Mandarme el enlace' : 'Entrar'}
              </Button>
            </form>
          )}

          <div className="mt-8 border-t border-rule pt-6 text-center text-sm text-muted">
            <p className="mb-2">¿Solo quieres verlo?</p>
            <Button variant="ghost" onClick={enterDemo}>
              Ver la demostración con el caso CE-INV
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
