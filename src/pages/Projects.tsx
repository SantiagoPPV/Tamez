import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useRepo, useSession } from '../app/session'
import { DemoRepository } from '../data/demoRepo'
import type { ProjectSummary } from '../data/repository'
import { emptyProject } from '../domain/factory'
import { freezeSent } from '../docs/autofill'
import { fmtDate } from '../domain/format'
import { TextField } from '../ui/fields'
import { Button, Card, Drawer, Empty, Eyebrow, Notice, Spinner } from '../ui/kit'

export function Projects() {
  const repo = useRepo()
  const { isDemo } = useSession()
  const navigate = useNavigate()
  const [list, setList] = useState<ProjectSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setList(await repo.listProjects())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Proyectos</Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight">El único lugar donde vive un proyecto</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink2">
            De sus datos salen los documentos, los reportes y los indicadores.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          Nuevo proyecto
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Empty>
          <p className="mb-3">Todavía no hay proyectos.</p>
          <Button onClick={loadExample} disabled={busy}>
            Cargar el caso de ejemplo CE-INV
          </Button>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((p) => (
            <li key={p.id}>
              <Link to={`/p/${p.id}`} className="block h-full">
                <Card className="h-full p-4 transition-colors hover:border-accent-mid">
                  <div className="text-xs font-bold tracking-wider text-accent">{p.key}</div>
                  <div className="mt-0.5 font-bold">{p.name || 'Sin nombre'}</div>
                  <div className="text-sm text-muted">{p.client}</div>
                  {p.cutoffDate && <div className="mt-2 text-xs text-muted">Corte: {fmtDate(p.cutoffDate)}</div>}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {list && list.length > 0 && !list.some((p) => p.key === 'CE-INV') && (
        <div className="mt-6">
          <Button variant="ghost" onClick={loadExample} disabled={busy}>
            Cargar el caso de ejemplo CE-INV
          </Button>
        </div>
      )}

      {isDemo && (
        <div className="mt-10 border-t border-rule pt-4 text-sm text-muted">
          <p>
            Estás en modo demostración: lo que captures se guarda solo en este navegador.{' '}
            <button
              type="button"
              className="font-semibold text-accent underline-offset-2 hover:underline"
              onClick={() => {
                DemoRepository.reset()
                window.location.assign('/')
              }}
            >
              Volver a los datos originales de CE-INV
            </button>
          </p>
        </div>
      )}

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

function NewProject({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (key: string, name: string, client: string) => Promise<void>
}) {
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
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
    <Drawer open={open} onClose={onClose} title="Nuevo proyecto" subtitle="Nace en blanco, con los valores iniciales de la minuta">
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <TextField label="Clave" help="Corta y única; va en los folios y en los nombres de archivo." value={key} onChange={setKey} required />
        <TextField label="Nombre del proyecto" value={name} onChange={setName} />
        <TextField label="Cliente" help="Razón social del cliente." value={client} onChange={setClient} />
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Creando…' : 'Crear y llenar sus parámetros'}
        </Button>
      </form>
    </Drawer>
  )
}
