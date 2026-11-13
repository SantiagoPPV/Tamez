import { Link } from 'react-router'
import { GATE_DEFS, PROJECT_STAGE, STAGE_ORDER } from '../../domain/catalogs'
import { todayInMexico } from '../../domain/dates'
import { fmtDate } from '../../domain/format'
import { effectiveStage, planningSteps, startSteps, type ProcessStep } from '../../domain/stage'
import type { GateNumber } from '../../domain/types'
import { Button, Card, cx, Notice, SectionTitle } from '../../ui/kit'
import { useP, useSaver } from './ctx'

/** El proceso del cliente: de Inicio a Servicio, con sus pasos y sus puertas. */
export function ProcessPage() {
  const { data, updateProject } = useP()
  const saver = useSaver()
  const stage = effectiveStage(data)
  const id = data.project.id
  const crmLink = data.project.prospectId ? `/crm/${data.project.prospectId}?paso=cierre` : 'proyecto'
  const href = (link: string) => (link.startsWith('/') ? link : `/p/${id}${link ? `/${link}` : ''}`)
  const gate = (n: GateNumber) => data.gates.find((g) => g.gate === n && !g.milestoneId)
  const accepted = data.milestones.filter((m) => m.actaDate).length
  const mark = (stepId: string, on: boolean) => {
    const process = { ...(data.project.process ?? {}) }
    if (on) process[stepId] = todayInMexico()
    else delete process[stepId]
    void saver.run(() => updateProject({ ...data.project, process }))
  }

  return (
    <div className="space-y-8">
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      <ol className="flex flex-wrap gap-2" aria-label="Etapas del cliente">
        {STAGE_ORDER.map((s) => {
          const reached = STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(s)
          return (
            <li
              key={s}
              className={cx(
                'rounded-full px-3 py-1 text-xs font-semibold',
                s === stage ? 'bg-accent text-white' : reached ? 'bg-accent-soft text-accent-2' : 'bg-soft text-muted',
              )}
              aria-current={s === stage ? 'step' : undefined}
            >
              {PROJECT_STAGE[s]}
            </li>
          )
        })}
      </ol>
      {stage === 'confirmed' && (
        <Notice tone="warn">
          Este expediente está por arrancar: aparece en Operaciones cuando se cobre el pago inicial.{' '}
          {data.project.prospectId && (
            <Link className="font-semibold underline" to={`/crm/${data.project.prospectId}`}>
              Seguir en el CRM
            </Link>
          )}
        </Notice>
      )}

      <Stage title="Cliente en Inicio" subtitle="Acta firmada, papeleo, pago inicial, involucrados, accesos y junta de arranque." gateN={2} gate={gate(2)} id={id}>
        <Steps steps={startSteps(data, crmLink)} href={href} mark={mark} />
      </Stage>

      <Stage title="Cliente en Planeación" subtitle="Diagnóstico y plan firmado: alcance, fechas y montos definitivos." gateN={3} gate={gate(3)} id={id}>
        <Steps steps={planningSteps(data)} href={href} mark={mark} />
      </Stage>

      <Stage title="Cliente en Ejecución" subtitle="Un hito a la vez, con calidad revisada y aceptación firmada (puerta 4 en cada hito)." id={id}>
        <Card className="p-4 text-sm">
          <b>
            {accepted} de {data.milestones.length}
          </b>{' '}
          hitos aceptados.{' '}
          <Link to={href('desglose')} className="font-semibold text-accent">
            Ver el desglose
          </Link>
        </Card>
      </Stage>

      <Stage title="Cliente en Cierre y en Servicio" subtitle="Acta de cierre, todo facturado y lecciones aprendidas; después, la mensualidad." gateN={5} gate={gate(5)} id={id}>
        <Card className="p-4 text-sm text-ink2">
          Al aprobar la puerta 5 el cliente pasa a {data.project.params.monthlyFee ? 'Servicio mensual' : 'proyecto cerrado'}.{' '}
          <Link to={href('servicio')} className="font-semibold text-accent">
            Servicio
          </Link>
        </Card>
      </Stage>
    </div>
  )
}

function Stage({ title, subtitle, gateN, gate, id, children }: { title: string; subtitle: string; gateN?: GateNumber; gate?: { approvedOn: string | null; requestedOn: string | null }; id: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionTitle
        aside={
          gateN ? (
            <Link to={`/p/${id}/puertas`} className={cx('text-sm font-semibold', gate?.approvedOn ? 'text-accent-2' : 'text-accent')}>
              Puerta {gateN} · {GATE_DEFS[gateN].name}: {gate?.approvedOn ? `aprobada ${fmtDate(gate.approvedOn)}` : gate?.requestedOn ? 'pedida' : 'pendiente'}
            </Link>
          ) : undefined
        }
      >
        {title}
      </SectionTitle>
      <p className="mb-3 text-sm text-ink2">{subtitle}</p>
      {children}
    </section>
  )
}

function Steps({ steps, href, mark }: { steps: ProcessStep[]; href: (l: string) => string; mark: (id: string, on: boolean) => void }) {
  return (
    <ol className="grid gap-2 md:grid-cols-2">
      {steps.map((s, i) => (
        <li key={s.id}>
          <Card className="flex h-full items-start gap-3 p-3">
            <span className={cx('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', s.done ? 'bg-accent text-white' : 'bg-soft text-muted')} aria-hidden>
              {s.done ? '✓' : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">
                <Link to={href(s.link)} className="hover:text-accent">
                  {s.title}
                </Link>
              </div>
              <div className="text-xs text-muted">{s.detail}</div>
              {s.manual && (
                <Button size="sm" variant="ghost" className="mt-1 -ml-2" onClick={() => mark(s.id, !s.done)}>
                  {s.done ? `Listo${s.doneOn ? ` el ${fmtDate(s.doneOn)}` : ''} · desmarcar` : 'Marcar como listo'}
                </Button>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ol>
  )
}
