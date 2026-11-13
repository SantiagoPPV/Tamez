import { useState, type FormEvent } from 'react'
import { useSession } from '../app/session'
import { TextField } from '../ui/fields'
import { Button, Card, Eyebrow, Notice } from '../ui/kit'

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
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <img src="/icono.svg" alt="" className="size-10" />
          <div>
            <Eyebrow>Software interno</Eyebrow>
            <h1 className="text-xl font-extrabold tracking-tight">Sistemas a la medida</h1>
          </div>
        </div>
        <Card className="p-5">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-soft p-1 text-sm font-semibold">
            <button type="button" className={`rounded-md py-1.5 ${!client ? 'bg-white shadow-sm' : 'text-ink2'}`} onClick={() => setClient(false)}>
              Socio del despacho
            </button>
            <button type="button" className={`rounded-md py-1.5 ${client ? 'bg-white shadow-sm' : 'text-ink2'}`} onClick={() => setClient(true)}>
              Cliente
            </button>
          </div>
          {client && linkSent ? (
            <Notice>Te mandamos un enlace a {linkSent}. Ábrelo en este mismo dispositivo para entrar al portal de tu proyecto.</Notice>
          ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && !client && <Notice tone="error">{error}</Notice>}
            {linkError && client && <Notice tone="error">{linkError}</Notice>}
            <TextField label="Correo" value={email} onChange={setEmail} required />
            {client ? (
              <p className="text-xs text-muted">Escribe el correo con el que el despacho te dio acceso: te llega un enlace para entrar, sin contraseña.</p>
            ) : (
            <div>
              <label htmlFor="pw" className="mb-1 block text-sm font-semibold text-ink2">
                Contraseña
              </label>
              <input
                id="pw"
                type="password"
                autoComplete="current-password"
                className="h-10 w-full rounded-lg border border-rule px-3 text-[15px] focus:border-accent focus:outline-none sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            )}
            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? 'Un momento…' : client ? 'Mandarme el enlace' : 'Entrar'}
            </Button>
          </form>
          )}
        </Card>
        <div className="mt-6 text-center text-sm text-muted">
          <p className="mb-2">¿Solo quieres verlo?</p>
          <Button variant="ghost" onClick={enterDemo}>
            Ver la demostración con el caso CE-INV
          </Button>
        </div>
      </div>
    </main>
  )
}
