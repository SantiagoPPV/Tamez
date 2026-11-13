import { useEffect, useMemo, useState } from 'react'
import { useCan, useRepo } from '../app/session'
import { ACTIVITY_TYPE, BLOCKS, HAT, LEVEL } from '../domain/catalogs'
import { todayInMexico } from '../domain/dates'
import { localId } from '../domain/factory'
import { fmtHours, fmtIndex, fmtPct } from '../domain/format'
import { calibrationSamples, LEVELS, projectLearning, proposeBaseHours, tableFromCells, TYPES } from '../domain/learning'
import type { ProjectData, TemplateRow, WbsTemplate } from '../domain/types'
import { SelectField, TextField } from '../ui/fields'
import { Button, Card, cx, Drawer, Eyebrow, Notice, SectionTitle, Spinner } from '../ui/kit'
import { useSaver } from './project/ctx'
import { useTemplatesAndBase } from './Proposal'
import { useAsk } from '../ui/feedback'

const LEVEL_LABEL = { simple: 'Simple', medium: 'Media', complex: 'Compleja' } as const

export function EstimatesPage() {
  const repo = useRepo()
  const ask = useAsk()
  const can = useCan()
  const tb = useTemplatesAndBase()
  const [projects, setProjects] = useState<ProjectData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<WbsTemplate | null>(null)
  const [fromProject, setFromProject] = useState(false)
  const saver = useSaver()
  useEffect(() => {
    repo.loadAllProjects().then(setProjects, (e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [repo])
  const currentVersion = [...(tb.baseRows ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  const samples = useMemo(() => (projects ? calibrationSamples(projects, currentVersion?.date ?? null) : []), [projects, currentVersion?.date])
  const cells = useMemo(() => proposeBaseHours(samples, tb.base), [samples, tb.base])
  const learning = useMemo(() => (projects ? projectLearning(projects) : []), [projects])
  if (!tb.ready) return <Spinner />
  const changes = cells.filter((c) => c.changes)

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:py-10">
      <div>
        <Eyebrow>Aprendizaje</Eyebrow>
        <h1 className="text-2xl font-extrabold tracking-tight">Base de estimaciones</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink2">
          Cotizar más rápido y con datos propios: la tabla de horas base se calibra con las horas reales de lo terminado; los desgloses tipo guardan cómo se partió
          cada clase de proyecto.
        </p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {saver.error && <Notice tone="error">{saver.error}</Notice>}

      <section>
        <SectionTitle>Tabla de horas base · {tb.baseVersion}</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2">Tipo de actividad</th>
                {LEVELS.map((l) => (
                  <th key={l} className="px-3 py-2 text-right">
                    {LEVEL_LABEL[l]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="num">
              {TYPES.map((t) => (
                <tr key={t} className="border-t border-rule">
                  <td className="px-3 py-2 font-sans">{ACTIVITY_TYPE[t]}</td>
                  {LEVELS.map((l) => (
                    <td key={l} className="px-3 py-2 text-right">
                      {fmtHours(tb.base[t][l])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-2 text-xs text-muted">
          Incluyen construir, escribir las pruebas automáticas, cumplir la lista de calidad y la revisión interna. Versiones: v1 (valores iniciales del manual)
          {(tb.baseRows ?? []).map((v) => `, ${v.version} (${v.date})`).join('')}.
        </p>
      </section>

      <section>
        <SectionTitle
          aside={
            can.approveBaseHours && changes.length > 0 ? (
              <Button
                variant="primary"
                disabled={saver.busy}
                onClick={() =>
                  void saver.run(async () => {
                    const n = (tb.baseRows?.length ?? 0) + 2
                    await tb.saveBase({ id: localId('bh'), version: `v${n}`, date: todayInMexico(), approvedBy: 'Arquitectura', table: tableFromCells(cells, tb.base), notes: `${samples.length} actividades terminadas` })
                  })
                }
              >
                Aprobar como nueva versión
              </Button>
            ) : undefined
          }
        >
          Calibración con horas reales
        </SectionTitle>
        <p className="mb-3 text-sm text-ink2">
          Actividades terminadas de los bloques 4, 5 y 6, sin nivel propio, desde la versión vigente: {samples.length}. La nueva hora base es el promedio de horas
          reales por tipo y nivel, a media hora; con menos de cinco actividades no se toca. La propone el líder de proyecto y la aprueba Arquitectura.
        </p>
        {!projects ? (
          <Spinner label="Leyendo los proyectos…" />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Tipo y nivel</th>
                  <th className="px-3 py-2 text-right">Actividades</th>
                  <th className="px-3 py-2 text-right">Estimadas (prom.)</th>
                  <th className="px-3 py-2 text-right">Reales (prom.)</th>
                  <th className="px-3 py-2 text-right">Eficiencia</th>
                  <th className="px-3 py-2 text-right">Vigente</th>
                  <th className="px-3 py-2 text-right">Propuesta</th>
                </tr>
              </thead>
              <tbody className="num">
                {cells
                  .filter((c) => c.count > 0)
                  .map((c) => (
                    <tr key={`${c.activityType}-${c.level}`} className={cx('border-t border-rule', c.changes && 'bg-ambar-soft/40')}>
                      <td className="px-3 py-2 font-sans">
                        {ACTIVITY_TYPE[c.activityType]} · {LEVEL_LABEL[c.level]}
                      </td>
                      <td className="px-3 py-2 text-right">{c.count}</td>
                      <td className="px-3 py-2 text-right">{fmtHours(c.avgEstimated)}</td>
                      <td className="px-3 py-2 text-right">{fmtHours(c.avgReal)}</td>
                      <td className={cx('px-3 py-2 text-right', c.efficiency != null && (c.efficiency < 0.9 || c.efficiency > 1.1) && 'font-bold text-rojo')}>{fmtIndex(c.efficiency)}</td>
                      <td className="px-3 py-2 text-right">{fmtHours(c.current)}</td>
                      <td className="px-3 py-2 text-right font-bold">{fmtHours(c.proposed)}</td>
                    </tr>
                  ))}
                {cells.every((c) => c.count === 0) && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center font-sans text-muted">
                      Todavía no hay actividades terminadas que calibrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section>
        <SectionTitle>Reserva, bolsa y margen por proyecto</SectionTitle>
        <p className="mb-3 text-sm text-ink2">Al cierre se registra cuánta reserva y cuánta bolsa se consumieron: con eso se revisan el 15 % y el 8 %.</p>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                {['Proyecto', 'Horas planeadas', 'Horas reales', 'Eficiencia', 'Reserva usada', 'Bolsa usada', 'Margen esperado', 'Margen proyectado'].map((h, i) => (
                  <th key={h} className={cx('px-3 py-2', i > 0 && 'text-right')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="num">
              {learning.map((l) => (
                <tr key={l.key} className="border-t border-rule">
                  <td className="px-3 py-2 font-sans font-semibold">{l.key}</td>
                  <td className="px-3 py-2 text-right">{fmtHours(l.plannedHours)}</td>
                  <td className="px-3 py-2 text-right">{fmtHours(l.realHours)}</td>
                  <td className="px-3 py-2 text-right">{fmtIndex(l.efficiency)}</td>
                  <td className="px-3 py-2 text-right">{fmtPct(l.reserveUsedPct)}</td>
                  <td className="px-3 py-2 text-right">{fmtPct(l.poolUsedPct)}</td>
                  <td className="px-3 py-2 text-right">{fmtPct(l.expectedMargin)}</td>
                  <td className="px-3 py-2 text-right">{fmtPct(l.projectedMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <SectionTitle aside={<Button size="sm" onClick={() => setFromProject(true)}>Guardar el desglose de un proyecto</Button>}>Desgloses tipo por clase de proyecto</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {tb.templates.map((t) => (
            <Card key={t.id} className="flex items-start justify-between gap-3 p-4">
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted">
                  {t.projectClass} · {t.rows.length} renglones{t.builtIn ? ' · del manual' : ''}
                </div>
                <p className="mt-1 text-sm text-ink2">{t.description}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button size="sm" onClick={() => setView(t)}>
                  Ver
                </Button>
                {!t.builtIn && (
                  <Button size="sm" variant="ghost" onClick={() => ask(`¿Borrar el desglose tipo «${t.name}»?`, () => saver.run(() => tb.removeTemplate(t.id)))}>
                    Borrar
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {view && (
        <Drawer open onClose={() => setView(null)} title={view.name} subtitle={view.projectClass}>
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="py-1.5">Actividad</th>
                <th className="py-1.5 text-right">Horas</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((r) => (
                <tr key={r.key} className="border-t border-rule align-top">
                  <td className="py-1.5">
                    <div>{r.activity}</div>
                    <div className="text-xs text-muted">
                      {BLOCKS[r.block]} · {ACTIVITY_TYPE[r.activityType]} · {LEVEL[r.level]} · {HAT[r.hat]}
                      {r.unit ? ' · por unidad' : ' · fija'}
                    </div>
                  </td>
                  <td className="num py-1.5 text-right">{fmtHours(r.hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Drawer>
      )}
      {fromProject && projects && (
        <FromProject
          projects={projects}
          close={() => setFromProject(false)}
          onSave={(t) => saver.run(() => tb.saveTemplate(t)).then((ok) => ok && setFromProject(false))}
        />
      )}
    </main>
  )
}

function FromProject({ projects, close, onSave }: { projects: ProjectData[]; close: () => void; onSave: (t: WbsTemplate) => void }) {
  const [pid, setPid] = useState<string | null>(projects[0]?.project.id ?? null)
  const [name, setName] = useState('')
  const [klass, setKlass] = useState('')
  const build = (): WbsTemplate | null => {
    const d = projects.find((p) => p.project.id === pid)
    if (!d) return null
    const segs = [...d.segments].sort((a, b) => a.position - b.position)
    const holderHat = (memberId: string | null) => d.hats.find((h) => h.holderId === memberId)?.hat ?? 'construction'
    const rows: TemplateRow[] = d.wbs
      .filter((w) => w.rowClass !== 'deliverable' && w.estimatedHours)
      .sort((a, b) => a.position - b.position)
      .map((w, i) => {
        const pos = segs.findIndex((s) => s.id === w.segmentId)
        return {
          key: `t-${i + 1}`,
          block: w.block ?? 1,
          deliverable: w.deliverable,
          activity: w.name,
          activityType: w.activityType ?? 'document',
          level: w.level ?? 'own',
          hat: holderHat(w.ownerId),
          hours: w.estimatedHours ?? 0,
          unit: null,
          fixed: true,
          segment: pos <= 0 ? 'p3' : pos === segs.length - 1 ? 'last' : pos === 1 ? 'h1' : 'build',
          note: '',
        }
      })
    return { id: localId('tpl'), name: name || `Desglose de ${d.project.key}`, projectClass: klass, description: `Tomado del desglose de ${d.project.key} · ${d.project.name}.`, rows, createdOn: todayInMexico() }
  }
  return (
    <Drawer
      open
      onClose={close}
      title="Guardar un desglose tipo"
      subtitle="Cada renglón queda como actividad fija con sus horas estimadas"
      footer={
        <div className="flex gap-2">
          <Button variant="primary" disabled={!pid} onClick={() => {
            const t = build()
            if (t) onSave(t)
          }}>
            Guardar
          </Button>
          <Button onClick={close}>Cancelar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SelectField label="Proyecto" value={pid} onChange={setPid} options={projects.map((p) => ({ value: p.project.id, label: `${p.project.key} · ${p.project.name}` }))} allowEmpty={false} />
        <TextField label="Nombre del desglose tipo" value={name} onChange={setName} />
        <TextField label="Clase de proyecto" help="Por ejemplo: inventarios, servicio en campo, conciliaciones." value={klass} onChange={setKlass} />
      </div>
    </Drawer>
  )
}
