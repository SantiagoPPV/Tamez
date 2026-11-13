import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useFirm, useGlobal } from '../app/useGlobal'
import { BASE_HOURS, BLOCKS, PROJECT_SIZE, options } from '../domain/catalogs'
import { DEFAULT_MIN_MONTHLY, emptyContent, emptyValidation, monthlyAmount } from '../domain/crm'
import { STANDARD_TEMPLATE, UNIT_LABELS, estimate, suggestPayments, suggestSize } from '../domain/estimating'
import { fmtHours, fmtMoney, fmtPct } from '../domain/format'
import type { EstimateUnits, Proposal, ProposalContent, UnitKey, WbsTemplate } from '../domain/types'
import { DocPreview, printDocument } from '../docs/DocPreview'
import { fillTemplate, loadTemplate } from '../docs/engine'
import { proposalDocData } from './crm/proposalDoc'
import { ValidationCard } from './crm/Validation'
import { DateField, FormGrid, NumberField, SelectField, TextArea, TextField } from '../ui/fields'
import { Button, Card, cx, Drawer, Eyebrow, Notice, SectionTitle, Spinner, Stat } from '../ui/kit'
import { useSaver } from './project/ctx'

const UNIT_GROUPS: { title: string; keys: UnitKey[] }[] = [
  { title: 'Calendario', keys: ['weeks', 'milestones', 'invoices', 'followWeeks'] },
  { title: 'Alcance', keys: ['sites', 'groups', 'technicalRisks', 'keyScreens'] },
  { title: 'Pantallas y reglas', keys: ['screensSimple', 'screensMedium', 'screensComplex', 'rules', 'dbChanges'] },
  { title: 'Reportes', keys: ['reportsSimple', 'reportsMedium', 'reportsComplex'] },
  { title: 'Conexiones', keys: ['connections', 'exchangesSimple', 'exchangesMedium', 'exchangesComplex'] },
]

export function useTemplatesAndBase() {
  const templates = useGlobal('wbsTemplates')
  const base = useGlobal('baseHours')
  const all: WbsTemplate[] = [STANDARD_TEMPLATE, ...(templates.rows ?? [])]
  const current = [...(base.rows ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0]
  return { templates: all, base: current?.table ?? BASE_HOURS, baseVersion: current?.version ?? 'v1', ready: Boolean(templates.rows && base.rows), reloadBase: base.reload, saveBase: base.save, baseRows: base.rows, saveTemplate: templates.save, removeTemplate: templates.remove }
}

export function ProposalPage() {
  const { prospectId = '', proposalId = '' } = useParams()
  const proposals = useGlobal('proposals')
  const prospects = useGlobal('prospects')
  const tb = useTemplatesAndBase()
  const original = proposals.rows?.find((p) => p.id === proposalId)
  const prospect = prospects.rows?.find((p) => p.id === prospectId)
  const [d, setD] = useState<Proposal | null>(null)
  const [showLines, setShowLines] = useState(false)
  const [preview, setPreview] = useState(false)
  const saver = useSaver()
  const { firm } = useFirm()
  useEffect(() => {
    if (original) setD(structuredClone(original))
  }, [original])

  const template = tb.templates.find((t) => t.id === d?.templateId) ?? STANDARD_TEMPLATE
  const est = useMemo(
    () =>
      d
        ? estimate({ template, units: d.units, size: d.size, base: tb.base, hourlyCost: d.hourlyCost, reservePct: d.reservePct, poolPct: d.poolPct, directCosts: d.directCosts, targetMargin: d.targetMargin, rowOverrides: d.rowOverrides, price: d.price })
        : null,
    [d, template, tb.base],
  )
  if (!proposals.rows || !prospects.rows || !tb.ready) return <Spinner />
  if (!original || !prospect || !d || !est) return <div className="mx-auto max-w-3xl px-4 py-10"><Notice tone="error">No existe esa propuesta.</Notice></div>

  const set = <K extends keyof Proposal>(k: K, v: Proposal[K]) => setD((x) => (x ? { ...x, [k]: v } : x))
  const setUnit = (k: UnitKey, v: number) => set('units', { ...d.units, [k]: Math.max(0, Math.round(v)) } as EstimateUnits)
  const dirty = JSON.stringify(d) !== JSON.stringify(original)
  const suggested = suggestSize(d.units)
  const paymentsSum = d.payments.reduce((s, p) => s + p.amount, 0)
  const monthly = monthlyAmount(est.price, d.units.weeks)
  const minMonthly = firm.minMonthlyAmount ?? DEFAULT_MIN_MONTHLY


  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <Link to={`/crm/${prospect.id}`} className="text-sm font-semibold text-accent">
        ← {prospect.company}
      </Link>
      <div className="mt-1 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>
            {prospect.company} · propuesta {d.variant} v{d.version}
          </Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight">{d.name || 'Propuesta'}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={!dirty || saver.busy} onClick={() => void saver.run(() => proposals.save(resetIfChanged(original, d)))}>
            Guardar
          </Button>
          <Button onClick={() => setPreview(true)}>Ver la D01</Button>
          {prospect.projectId && (
            <Link to={`/p/${prospect.projectId}`} className="self-center text-sm font-semibold text-accent">
              Ir al proyecto
            </Link>
          )}
        </div>
      </div>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="space-y-6">
          <Card className="p-4">
            <FormGrid>
              <TextField label="Nombre del proyecto" value={d.name} onChange={(v) => set('name', v)} />
              <SelectField label="Estado" value={d.status} onChange={(v) => v && set('status', v)} options={[{ value: 'draft', label: 'Borrador' }, { value: 'sent', label: 'Enviada' }, { value: 'accepted', label: 'Aceptada' }, { value: 'rejected', label: 'Rechazada' }]} allowEmpty={false} />
              <SelectField label="Versión" value={d.variant} onChange={(v) => v && set('variant', v)} options={[{ value: 'preliminar', label: 'Preliminar' }, { value: 'definitiva', label: 'Definitiva' }]} allowEmpty={false} />
              <SelectField label="Desglose tipo" value={d.templateId} onChange={(v) => v && set('templateId', v)} options={tb.templates.map((t) => ({ value: t.id, label: t.name }))} allowEmpty={false} />
              <DateField label="Fecha" value={d.date} onChange={(v) => v && set('date', v)} />
              <DateField label="Vigente hasta" help="Valor inicial: 15 días naturales." value={d.validUntil} onChange={(v) => set('validUntil', v)} />
            </FormGrid>
          </Card>

          <ContentEditor content={{ ...emptyContent(), ...(d.content ?? {}) }} onChange={(c) => set('content', c)} />

          <section>
            <SectionTitle>Unidades</SectionTitle>
            <p className="mb-3 text-sm text-ink2">Se cuentan las unidades y se elige el tamaño. Una unidad más es cambio de alcance. CE-INV: 13 semanas, 3 hitos, 3 almacenes, 13 pantallas y una conexión con dos intercambios.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {UNIT_GROUPS.map((g) => (
                <Card key={g.title} className="p-4">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{g.title}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {g.keys.map((k) => (
                      <NumberField key={k} label={UNIT_LABELS[k]} value={d.units[k]} onChange={(v) => setUnit(k, v ?? 0)} />
                    ))}
                  </div>
                </Card>
              ))}
              <Card className="p-4">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Tamaño</h3>
                <SelectField label="Tamaño del proyecto" value={d.size} onChange={(v) => v && set('size', v)} options={options(Object.fromEntries(Object.entries(PROJECT_SIZE).map(([k, v]) => [k, `${v.label} (factor ${v.factor})`])) as Record<'small' | 'medium' | 'large', string>)} allowEmpty={false} help={PROJECT_SIZE[d.size].hint} />
                {suggested !== d.size && <p className="mt-2 text-xs font-semibold text-ambar">Las unidades apuntan a «{PROJECT_SIZE[suggested].label}»: se toma el mayor.</p>}
              </Card>
            </div>
          </section>

          <section>
            <SectionTitle aside={<Button size="sm" variant="ghost" onClick={() => setShowLines((x) => !x)}>{showLines ? 'Ocultar renglones' : 'Ver renglones'}</Button>}>
              Horas por bloque
            </SectionTitle>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="num">
                  {est.byBlock.map((b) => (
                    <tr key={b.block} className="border-t border-rule first:border-0">
                      <td className="px-3 py-2 font-sans">{BLOCKS[b.block]}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtHours(b.hours)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-ink font-bold">
                    <td className="px-3 py-2 font-sans">Horas de actividades ({fmtHours(est.fixedHours)} fijas)</td>
                    <td className="px-3 py-2 text-right">{fmtHours(est.activityHours)}</td>
                  </tr>
                </tbody>
              </table>
            </Card>
            {showLines && (
              <Card className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-3 py-2">Bloque</th>
                      <th className="px-3 py-2">Actividad</th>
                      <th className="px-3 py-2 text-right">Unidades</th>
                      <th className="px-3 py-2 text-right">h por unidad</th>
                      <th className="px-3 py-2 text-right">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="num">
                    {est.lines.map((l) => (
                      <tr key={l.row.key} className={cx('border-t border-rule', l.hours === 0 && 'text-muted')}>
                        <td className="px-3 py-1.5">{l.row.block}</td>
                        <td className="px-3 py-1.5 font-sans">
                          {l.row.activity}
                          <div className="text-xs text-muted">{l.row.deliverable}{l.row.note && ` · ${l.row.note}`}</div>
                        </td>
                        <td className="px-3 py-1.5 text-right">{l.row.fixed ? 'Fija' : l.units}</td>
                        <td className="px-3 py-1.5 text-right">{fmtHours(l.unitHours)}</td>
                        <td className="px-3 py-1.5 text-right">
                          <input
                            className="w-20 rounded border border-rule px-1.5 py-0.5 text-right"
                            inputMode="decimal"
                            value={d.rowOverrides[l.row.key] ?? ''}
                            placeholder={fmtHours(l.hours)}
                            onChange={(e) => {
                              const v = e.target.value.replace(',', '.')
                              const next = { ...d.rowOverrides }
                              if (v === '' || Number.isNaN(Number(v))) delete next[l.row.key]
                              else next[l.row.key] = Number(v)
                              set('rowOverrides', next)
                            }}
                            aria-label={`Horas de ${l.row.activity}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ValidationCard proposal={original} prospect={prospect} save={(p) => proposals.save(p)} />
          <Card className="p-4">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">De las horas al precio</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Costo interno por hora" value={d.hourlyCost} onChange={(v) => set('hourlyCost', v ?? 0)} suffix="$" />
              <NumberField label="Gastos directos" value={d.directCosts} onChange={(v) => set('directCosts', v ?? 0)} suffix="$" />
              <NumberField label="Reserva" value={Math.round(d.reservePct * 1000) / 10} onChange={(v) => set('reservePct', (v ?? 0) / 100)} suffix="%" />
              <NumberField label="Bolsa de ajustes" value={Math.round(d.poolPct * 1000) / 10} onChange={(v) => set('poolPct', (v ?? 0) / 100)} suffix="%" />
              <NumberField label="Margen esperado" value={Math.round(d.targetMargin * 1000) / 10} onChange={(v) => set('targetMargin', (v ?? 0) / 100)} suffix="%" />
              <NumberField label="Precio (vacío = sugerido)" value={d.price} onChange={(v) => set('price', v)} suffix="$" />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-3">
              <Stat label="Horas presupuestadas" value={fmtHours(est.budgetedHours)} hint={`${fmtHours(est.activityHours)} + ${est.reserveHours} reserva + ${est.poolHours} bolsa`} />
              <Stat label="Costo total" value={fmtMoney(est.totalCost)} />
              <Stat label="Precio sugerido" value={fmtMoney(est.suggestedPrice)} hint="Costo ÷ (1 − margen), al millar" />
              <Stat label="Margen" value={fmtPct(est.marginPct)} hint={fmtMoney(est.margin)} />
              <Stat label="Tarifa de cambios" value={est.changeRate ? fmtMoney(est.changeRate) : '—'} hint="Precio ÷ horas de actividades" />
              <Stat
                label="Venta por mes de creación"
                value={<span className={monthly.perMonth != null && monthly.perMonth < minMonthly ? 'text-rojo' : 'text-accent-2'}>{monthly.perMonth == null ? '—' : fmtMoney(monthly.perMonth)}</span>}
                hint={`${monthly.months} meses · mínimo ${fmtMoney(minMonthly)}`}
              />
            </dl>
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Pagos</h3>
              <Button size="sm" onClick={() => set('payments', suggestPayments(est, d.units.milestones, d.hourlyCost))}>
                Sugerir
              </Button>
            </div>
            {d.payments.map((p, i) => (
              <div key={i} className="mb-2 grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                <input className="w-full min-w-0 rounded border border-rule px-2 py-1 text-sm" value={p.label} onChange={(e) => set('payments', d.payments.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Pago" />
                <input className="num w-full min-w-0 rounded border border-rule px-2 py-1 text-right text-sm" inputMode="numeric" value={p.amount} onChange={(e) => set('payments', d.payments.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)))} aria-label="Monto" />
              </div>
            ))}
            <p className={cx('text-xs', paymentsSum === est.price ? 'text-accent-2' : 'text-ambar')}>
              Suman {fmtMoney(paymentsSum)} de {fmtMoney(est.price)}. El pago inicial cubre al menos el costo hasta la puerta 3; el cobro acumulado al aceptar cada hito cubre el costo acumulado.
            </p>
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Mensualidad</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Mensualidad" value={d.monthlyFee} onChange={(v) => set('monthlyFee', v)} suffix="$" />
              <NumberField label="Bolsa al mes" value={d.monthlyPoolHours} onChange={(v) => set('monthlyPoolHours', v ?? 0)} suffix="h" />
            </div>
          </Card>
          <TextArea label="Notas" value={d.notes} onChange={(v) => set('notes', v)} rows={2} />
        </aside>
      </div>
      {preview && <ProposalPreview proposal={d} close={() => setPreview(false)} />}
    </main>
  )
}

/** La D01 de una propuesta, armada sobre un proyecto virtual (todavía no existe el proyecto). */
function ProposalPreview({ proposal, close }: { proposal: Proposal; close: () => void }) {
  const prospects = useGlobal('prospects')
  const proposals = useGlobal('proposals')
  const tb = useTemplatesAndBase()
  const { firm } = useFirm()
  const [html, setHtml] = useState<string | null>(null)
  const prospect = prospects.rows?.find((p) => p.id === proposal.prospectId)
  useEffect(() => {
    if (!prospect || !proposals.rows || !prospects.rows) return
    const data = proposalDocData({ proposal, prospect, prospects: prospects.rows, proposals: proposals.rows, templates: tb.templates, base: tb.base, firm })
    void loadTemplate('D01-propuesta').then((t) => setHtml(fillTemplate(t, data, { markMissing: true, headerRight: prospect.company }).html))
  }, [prospect, proposals.rows, prospects.rows, proposal, firm, tb.base, tb.templates])
  return (
    <Drawer open onClose={close} title={`D01 · Propuesta ${proposal.variant}`} subtitle="Sale de la estimación y del contenido de la propuesta">
      {html ? (
        <div className="space-y-3">
          <Button onClick={() => printDocument(html.replace(/\.falta[^}]*}/g, ''), `D01-propuesta-${proposal.variant}-v${proposal.version}`)}>Imprimir o guardar PDF</Button>
          <DocPreview html={html} title="D01" />
        </div>
      ) : (
        <Spinner />
      )}
    </Drawer>
  )
}

/** Si cambia lo que dirección general validó, se pide validar de nuevo. */
function resetIfChanged(before: Proposal, after: Proposal): Proposal {
  const v = before.validation
  if (!v?.approvedOn) return after
  const key = (p: Proposal) => JSON.stringify([p.units, p.size, p.price, p.payments, p.content, p.monthlyFee, p.hourlyCost, p.targetMargin, p.rowOverrides, p.directCosts])
  if (key(before) === key(after)) return after
  return { ...after, validation: { ...emptyValidation(), changesRequested: 'La propuesta cambió después de validarse: pide la validación de nuevo.' } }
}

const CONTENT_FIELDS: { k: keyof ProposalContent; label: string; help?: string; rows?: number }[] = [
  { k: 'objective', label: 'Objetivo', rows: 2 },
  { k: 'problem', label: 'El problema, con sus palabras', help: 'Una frase por renglón.' },
  { k: 'approach', label: 'Cómo lo logramos', help: 'Un paso por renglón.' },
  { k: 'result', label: 'El resultado: lo que podrán comprobar', help: 'Un resultado por renglón; «Nombre: cómo se comprueba».' },
  { k: 'includes', label: 'Alcance: qué incluye', help: 'Uno por renglón.' },
  { k: 'excludes', label: 'Alcance: qué no incluye', help: 'Uno por renglón.' },
  { k: 'clientNeeds', label: 'Lo que se requiere del cliente', help: 'Uno por renglón: «qué | quién | cuándo».' },
  { k: 'dataConfidentiality', label: 'Datos y confidencialidad', rows: 3 },
  { k: 'thirdParties', label: 'Lo que depende de terceros', help: 'Uno por renglón: «servicio | quién lo contrata | a nombre de quién | quién lo paga».' },
  { k: 'conditions', label: 'Condiciones y supuestos', help: 'Uno por renglón.' },
]

function ContentEditor({ content, onChange }: { content: ProposalContent; onChange: (c: ProposalContent) => void }) {
  return (
    <section>
      <SectionTitle>Lo que dice la propuesta</SectionTitle>
      <p className="mb-3 text-sm text-ink2">
        Objetivo, problema, cómo lo logramos, resultado, alcance, lo que se requiere del cliente, datos y confidencialidad, terceros y condiciones. El plan de pagos y el
        cronograma salen de la estimación. Esto mismo pasa al acta de inicio.
      </p>
      <Card className="grid gap-3 p-4 md:grid-cols-2">
        {CONTENT_FIELDS.map((f) => (
          <TextArea key={f.k} className={f.k === 'objective' || f.k === 'dataConfidentiality' ? 'md:col-span-2' : undefined} label={f.label} help={f.help} rows={f.rows ?? 3} value={content[f.k]} onChange={(v) => onChange({ ...content, [f.k]: v })} />
        ))}
      </Card>
    </section>
  )
}
