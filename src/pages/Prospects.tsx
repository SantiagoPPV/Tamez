import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useGlobal } from '../app/useGlobal'
import { PROSPECT_STAGE, options } from '../domain/catalogs'
import { todayInMexico } from '../domain/dates'
import { ZERO_UNITS } from '../domain/estimating'
import { localId } from '../domain/factory'
import { fmtDate, fmtMoney } from '../domain/format'
import type { Proposal, Prospect, ProspectStage } from '../domain/types'
import { DateField, FormGrid, SelectField, TextArea, TextField } from '../ui/fields'
import { Button, Card, cx, Drawer, Empty, Eyebrow, Notice, Spinner } from '../ui/kit'
import { useSaver } from './project/ctx'

const STAGES: ProspectStage[] = ['qualify', 'discovery', 'feasibility', 'proposal', 'won', 'lost']

export function newProposal(prospect: Prospect, version: number): Proposal {
  return {
    id: localId('prop'),
    prospectId: prospect.id,
    name: prospect.problem ? 'Sistema a la medida' : prospect.company,
    variant: 'preliminar',
    version,
    date: todayInMexico(),
    validUntil: null,
    templateId: 'estandar-v1',
    size: 'medium',
    units: { ...ZERO_UNITS, weeks: 8, milestones: 2, invoices: 3, sites: 1, groups: 1, technicalRisks: 1, keyScreens: 3, followWeeks: 1 },
    rowOverrides: {},
    hourlyCost: 500,
    reservePct: 0.15,
    poolPct: 0.08,
    directCosts: 0,
    targetMargin: 0.16,
    price: null,
    payments: [],
    monthlyFee: null,
    monthlyPoolHours: 8,
    status: 'draft',
    notes: '',
  }
}

export function ProspectsPage() {
  const prospects = useGlobal('prospects')
  const proposals = useGlobal('proposals')
  const [edit, setEdit] = useState<Prospect | null>(null)
  if (!prospects.rows || !proposals.rows) return <Spinner />
  const blank = (): Prospect => ({
    id: localId('pros'),
    company: '',
    contactName: '',
    contactRole: '',
    source: '',
    stage: 'qualify',
    problem: '',
    budget: '',
    decisionMaker: '',
    decisionDate: null,
    nextStep: '',
    nextStepDate: null,
    lostReason: '',
    projectId: null,
    createdOn: todayInMexico(),
    notes: '',
  })
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Preventa</Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight">Prospectos y propuestas</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink2">
            Solo proyectos que podemos hacer y que convienen. Cada propuesta se estima de abajo hacia arriba con el desglose estándar y las horas reales.
          </p>
        </div>
        <Button variant="primary" onClick={() => setEdit(blank())}>
          Nuevo prospecto
        </Button>
      </div>
      {prospects.error && <Notice tone="error">{prospects.error}</Notice>}
      {prospects.rows.length === 0 ? (
        <Empty>Sin prospectos.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((st) => (
            <section key={st}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                {PROSPECT_STAGE[st]} <span className="font-normal">({prospects.rows!.filter((p) => p.stage === st).length})</span>
              </h2>
              <ul className="space-y-2">
                {prospects.rows!
                  .filter((p) => p.stage === st)
                  .map((p) => {
                    const props = proposals.rows!.filter((x) => x.prospectId === p.id)
                    return (
                      <li key={p.id}>
                        <button type="button" onClick={() => setEdit(structuredClone(p))} className="w-full text-left">
                          <Card className="p-3 hover:border-accent-mid">
                            <div className="text-sm font-semibold">{p.company}</div>
                            {p.problem && <div className="mt-0.5 line-clamp-2 text-xs text-ink2">{p.problem}</div>}
                            <div className="mt-1 text-xs text-muted">
                              {p.nextStep && `${p.nextStep}${p.nextStepDate ? ` · ${fmtDate(p.nextStepDate)}` : ''}`}
                              {props.length > 0 && ` · ${props.length} propuesta${props.length > 1 ? 's' : ''}`}
                            </div>
                          </Card>
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </section>
          ))}
        </div>
      )}
      {edit && <ProspectForm prospect={edit} close={() => setEdit(null)} prospects={prospects} proposals={proposals} />}
    </main>
  )
}

function ProspectForm({
  prospect,
  close,
  prospects,
  proposals,
}: {
  prospect: Prospect
  close: () => void
  prospects: ReturnType<typeof useGlobal<'prospects'>>
  proposals: ReturnType<typeof useGlobal<'proposals'>>
}) {
  const [d, setD] = useState(prospect)
  const saver = useSaver()
  const navigate = useNavigate()
  const isNew = !prospects.rows?.some((p) => p.id === d.id)
  const set = <K extends keyof Prospect>(k: K, v: Prospect[K]) => setD((x) => ({ ...x, [k]: v }))
  const mine = (proposals.rows ?? []).filter((p) => p.prospectId === d.id).sort((a, b) => b.version - a.version)
  return (
    <Drawer
      open
      onClose={close}
      title={d.company || 'Nuevo prospecto'}
      subtitle={PROSPECT_STAGE[d.stage]}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={!d.company.trim() || saver.busy} onClick={() => void saver.run(() => prospects.save(d)).then((ok) => ok && close())}>
            Guardar
          </Button>
          <Button onClick={close}>Cancelar</Button>
          <div className="flex-1" />
          {!isNew && !d.projectId && (
            <Button variant="danger" onClick={() => confirm('¿Borrar el prospecto y sus propuestas?') && void saver.run(() => prospects.remove(d.id)).then((ok) => ok && close())}>
              Borrar
            </Button>
          )}
        </div>
      }
    >
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      <FormGrid>
        <TextField className="sm:col-span-2" label="Empresa" value={d.company} onChange={(v) => set('company', v)} />
        <SelectField label="Etapa" value={d.stage} onChange={(v) => v && set('stage', v)} options={options(PROSPECT_STAGE)} allowEmpty={false} />
        <TextField label="De dónde llegó" value={d.source} onChange={(v) => set('source', v)} />
        <TextField label="Contacto" value={d.contactName} onChange={(v) => set('contactName', v)} />
        <TextField label="Puesto" value={d.contactRole} onChange={(v) => set('contactRole', v)} />
        <TextArea className="sm:col-span-2" label="El problema, en sus palabras" value={d.problem} onChange={(v) => set('problem', v)} rows={2} />
        <TextField label="Quién decide" value={d.decisionMaker} onChange={(v) => set('decisionMaker', v)} />
        <TextField label="Presupuesto" value={d.budget} onChange={(v) => set('budget', v)} />
        <DateField label="Fecha de decisión" value={d.decisionDate} onChange={(v) => set('decisionDate', v)} />
        <div />
        <TextField label="Siguiente paso" value={d.nextStep} onChange={(v) => set('nextStep', v)} />
        <DateField label="Fecha del siguiente paso" value={d.nextStepDate} onChange={(v) => set('nextStepDate', v)} />
        {d.stage === 'lost' && <TextField className="sm:col-span-2" label="Por qué se perdió" value={d.lostReason} onChange={(v) => set('lostReason', v)} />}
        <TextArea className="sm:col-span-2" label="Notas" value={d.notes} onChange={(v) => set('notes', v)} rows={2} />
      </FormGrid>
      <p className="mt-3 text-xs text-muted">Calificar: constan quién decide, el problema, el presupuesto y la fecha.</p>
      {!isNew && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">Propuestas</h3>
            <Button
              size="sm"
              onClick={() =>
                void saver
                  .run(async () => {
                    const pr = await proposals.save(newProposal(d, (mine[0]?.version ?? 0) + 1))
                    navigate(`/prospectos/${d.id}/${pr.id}`)
                  })
              }
            >
              Nueva propuesta
            </Button>
          </div>
          {mine.length === 0 ? (
            <p className="text-sm text-muted">Sin propuestas.</p>
          ) : (
            <ul className="space-y-1.5">
              {mine.map((p) => (
                <li key={p.id}>
                  <Link to={`/prospectos/${d.id}/${p.id}`} className="flex items-center justify-between rounded-lg border border-rule px-3 py-2 text-sm hover:border-accent-mid">
                    <span>
                      <b>{p.name}</b> · {p.variant} v{p.version} · {fmtDate(p.date)}
                    </span>
                    <span className={cx('text-xs font-semibold', p.status === 'accepted' ? 'text-accent' : 'text-muted')}>
                      {p.price ? fmtMoney(p.price) : ''} · {{ draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada' }[p.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {d.projectId && (
            <Link to={`/p/${d.projectId}`} className="mt-3 inline-block text-sm font-semibold text-accent">
              Ir al proyecto
            </Link>
          )}
        </div>
      )}
    </Drawer>
  )
}
