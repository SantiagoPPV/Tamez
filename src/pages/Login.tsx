import { useState, type FormEvent } from 'react'
import { useSession } from '../app/session'
import { TextField } from '../ui/fields'
import { Button, Card, Eyebrow, Notice } from '../ui/kit'

export function Login({ error }: { error?: string }) {
  const { signIn, enterDemo } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    await signIn(email.trim(), password)
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
          <form onSubmit={submit} className="space-y-4">
            {error && <Notice tone="error">{error}</Notice>}
            <TextField label="Correo" value={email} onChange={setEmail} required />
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
            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
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
