import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useFirm, useGlobal } from '../../app/useGlobal'
import { DOCUMENTS, DOCUMENT_STATUS } from '../../domain/catalogs'
import { diffDays, todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate, folio } from '../../domain/format'
import { monthsBetween } from '../../domain/service'
import type { DocContext, DocData, DocumentCode, ProjectData, ProjectDocument } from '../../domain/types'
import { autofill, docFolder, fieldSource, fileBase, resolveDoc, type DocEnv } from '../../docs/autofill'
import { DocPreview, printDocument } from '../../docs/DocPreview'
import { fillTemplate, loadTemplate, templateSchema, type TemplateSchema } from '../../docs/engine'
import { monthName } from '../../docs/text'
import { SelectField } from '../../ui/fields'
import { Button, Card, cx, Drawer, Eyebrow, Notice, SectionTitle, Spinner } from '../../ui/kit'
import { useP, useSaver } from './ctx'

const STAGES: { title: string; codes: DocumentCode[] }[] = [
  { title: 'Preventa', codes: ['D01', 'D10'] },
  { title: 'Inicio y planeación', codes: ['D02', 'D03', 'D12'] },
  { title: 'Hitos', codes: ['D04', 'D07', 'D14'] },
  { title: 'Control', codes: ['D05', 'D06', 'D11', 'D13'] },
  { title: 'Cierre y servicio', codes: ['D08', 'D09'] },
]

const STATUS_STYLE: Record<ProjectDocument['status'], string> = {
  draft: 'bg-soft text-muted',
  sent: 'bg-ambar-soft text-ambar',
  signed: 'bg-accent-soft text-accent-2',
}

export function contextLabel(doc: ProjectDocument, data: ProjectData): string {
  const c = doc.context
  if (c.milestoneId) return data.milestones.find((m) => m.id === c.milestoneId)?.key.replace(/^H/, 'Hito ') ?? ''
  if (c.changeId) {
    const ch = data.changes.find((x) => x.id === c.changeId)
    return ch ? folio.change(ch.seq) : ''
  }
  if (c.week) return `Semana ${c.week}`
  if (c.month) return monthName(c.month)
  if (c.variant) return c.variant === 'definitiva' ? 'Definitiva' : 'Preliminar'
  return ''
}

const sameContext = (a: DocContext, b: DocContext) =>
  (a.milestoneId ?? null) === (b.milestoneId ?? null) &&
  (a.changeId ?? null) === (b.changeId ?? null) &&
  (a.week ?? null) === (b.week ?? null) &&
  (a.month ?? null) === (b.month ?? null) &&
  (a.variant ?? null) === (b.variant ?? null)

export function DocumentsPage() {
  const { data, save } = useP()
  const navigate = useNavigate()
  const [creating, setCreating] = useState<DocumentCode | null>(null)
  const saver = useSaver()

  async function create(code: DocumentCode, context: DocContext) {
    const same = data.documents.filter((d) => d.code === code && sameContext(d.context, context))
    const version = same.reduce((m, d) => Math.max(m, d.version), 0) + 1
    const prev = [...same].sort((a, b) => b.version - a.version)[0]
    const doc: ProjectDocument = {
      id: localId('doc'),
      code,
      version,
      status: 'draft',
      context,
      overrides: prev ? structuredClone(prev.overrides) : { fields: {}, lists: {} },
      snapshot: null,
      createdOn: todayInMexico(),
      sentOn: null,
      signedOn: null,
      notes: '',
    }
    const ok = await saver.run(() => save('documents', doc))
    if (ok) navigate(doc.id)
  }

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm text-ink2">
        Los documentos se generan, no se redactan: misma plantilla, mismo diseño, datos del proyecto. Lo que no sale de los datos se captura una vez. La
        versión sube con cada envío al cliente y lo enviado queda congelado.
      </p>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {STAGES.map((stage) => (
        <section key={stage.title}>
          <SectionTitle>{stage.title}</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stage.codes.map((code) => {
              const def = DOCUMENTS[code]
              const docs = data.documents.filter((d) => d.code === code).sort((a, b) => (a.createdOn === b.createdOn ? b.version - a.version : b.createdOn.localeCompare(a.createdOn)))
              return (
                <Card key={code} className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-accent">{code}</div>
                      <div className="font-semibold">{def.title}</div>
                      <div className="text-xs text-muted">
                        {def.client ? 'Lo ve el cliente' : 'Interno'} · lo prepara {def.prepares} · {def.folder}
                      </div>
                    </div>
                    {def.template ? (
                      <Button size="sm" onClick={() => (def.context === 'none' ? void create(code, {}) : setCreating(code))}>
                        Nuevo
                      </Button>
                    ) : (
                      <Link to={`../imprimir/${code.toLowerCase()}`} className="text-sm font-semibold text-accent">
                        Ver e imprimir
                      </Link>
                    )}
                  </div>
                  {!def.template && <p className="mt-2 text-xs text-muted">Es una vista del módulo de control.</p>}
                  {docs.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {docs.map((d) => (
                        <li key={d.id}>
                          <Link to={d.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface">
                            <span>
                              <span className="font-semibold">v{d.version}</span> {contextLabel(d, data)}
                              <span className="ml-2 text-xs text-muted">{fmtDate(d.signedOn ?? d.sentOn ?? d.createdOn)}</span>
                            </span>
                            <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_STYLE[d.status])}>{DOCUMENT_STATUS[d.status]}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )
            })}
          </div>
        </section>
      ))}
      {creating && <NewDocument code={creating} close={() => setCreating(null)} onCreate={(ctx) => void create(creating, ctx)} />}
    </div>
  )
}

function NewDocument({ code, close, onCreate }: { code: DocumentCode; close: () => void; onCreate: (ctx: DocContext) => void }) {
  const { data, result } = useP()
  const proposals = useGlobal('proposals')
  const prospects = useGlobal('prospects')
  const def = DOCUMENTS[code]
  const [value, setValue] = useState<string | null>(null)
  const [variant, setVariant] = useState<'preliminar' | 'definitiva'>('preliminar')
  const today = todayInMexico()
  const weekOf = (d: string) => (data.project.startDate ? Math.floor(diffDays(data.project.startDate, d) / 7) + 1 : 1)
  const options = useMemo(() => {
    switch (def.context) {
      case 'milestone':
        return [...data.milestones].sort((a, b) => a.key.localeCompare(b.key)).map((m) => ({ value: m.id, label: `${m.key} · ${m.title}` }))
      case 'change':
        return data.changes.map((c) => ({ value: c.id, label: `${folio.change(c.seq)} · ${c.description.slice(0, 50)}` }))
      case 'week': {
        const out = [{ value: result.cutoff, label: `Semana ${weekOf(result.cutoff)} · corte ${fmtDate(result.cutoff)}` }]
        for (const s of data.snapshots) if (s.cutoff !== result.cutoff) out.push({ value: s.cutoff, label: `Semana ${s.week} · corte ${fmtDate(s.cutoff)}` })
        return out
      }
      case 'month': {
        const start = (data.project.params.serviceStart ?? today).slice(0, 7)
        const end = (today > start ? today : `${start}-01`).slice(0, 7)
        return monthsBetween(start, end < start ? start : end).map((m) => ({ value: m, label: monthName(m) }))
      }
      case 'proposal': {
        const mine = prospects.rows?.filter((p) => p.projectId === data.project.id).map((p) => p.id) ?? []
        return (proposals.rows ?? []).filter((p) => !mine.length || mine.includes(p.prospectId)).map((p) => ({ value: p.id, label: `${p.name} · ${p.variant} v${p.version}` }))
      }
      default:
        return []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.context, data, result.cutoff, proposals.rows, prospects.rows])

  const ctx = (): DocContext => {
    switch (def.context) {
      case 'milestone':
        return { milestoneId: value }
      case 'change':
        return { changeId: value }
      case 'week':
        return { cutoff: value, week: value ? weekOf(value) : null }
      case 'month':
        return { month: value }
      case 'proposal':
        return { proposalId: value, variant }
      default:
        return {}
    }
  }
  return (
    <Drawer
      open
      onClose={close}
      title={`Nuevo ${code} · ${def.title}`}
      footer={
        <div className="flex gap-2">
          <Button variant="primary" disabled={!value && def.context !== 'proposal'} onClick={() => onCreate(ctx())}>
            Crear borrador
          </Button>
          <Button onClick={close}>Cancelar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SelectField
          label={{ milestone: 'Hito', change: 'Solicitud de cambio', week: 'Semana (fecha de corte)', month: 'Mes de servicio', proposal: 'Propuesta', none: '' }[def.context]}
          value={value}
          onChange={setValue}
          options={options}
          placeholder={def.context === 'proposal' ? 'Sin propuesta ligada' : 'Elige uno'}
        />
        {def.context === 'proposal' && (
          <SelectField
            label="Versión de la propuesta"
            value={variant}
            onChange={(v) => v && setVariant(v)}
            options={[
              { value: 'preliminar', label: 'Preliminar' },
              { value: 'definitiva', label: 'Definitiva' },
            ]}
            allowEmpty={false}
          />
        )}
      </div>
    </Drawer>
  )
}

/* =============================================================== editor */

const prettyField = (name: string) => name.split('.').slice(1).join(' · ').replace(/_/g, ' ')

export function useDocEnv(data: ProjectData): DocEnv | null {
  const { firm } = useFirm()
  const proposals = useGlobal('proposals')
  const prospects = useGlobal('prospects')
  return useMemo(
    () => (proposals.rows && prospects.rows ? { data, firm, proposals: proposals.rows, prospects: prospects.rows } : null),
    [data, firm, proposals.rows, prospects.rows],
  )
}

export function DocumentEditor() {
  const { docId = '' } = useParams()
  const { data, save, remove, updateProject } = useP()
  const navigate = useNavigate()
  const env = useDocEnv(data)
  const doc = data.documents.find((d) => d.id === docId)
  const [template, setTemplate] = useState<string | null>(null)
  const [tab, setTab] = useState<'campos' | 'listas'>('campos')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [draft, setDraft] = useState<ProjectDocument | null>(doc ? structuredClone(doc) : null)
  const saver = useSaver()

  useEffect(() => {
    if (doc) setDraft(structuredClone(doc))
  }, [doc])
  useEffect(() => {
    const name = doc ? DOCUMENTS[doc.code].template : null
    if (name) void loadTemplate(name).then(setTemplate)
  }, [doc])

  const schema: TemplateSchema | null = useMemo(() => (template ? templateSchema(template) : null), [template])
  const auto = useMemo(() => (draft && env ? autofill(draft, env) : null), [draft, env])
  const resolved = useMemo(() => (draft && env ? resolveDoc(draft, env) : null), [draft, env])
  const filled = useMemo(
    () =>
      template && resolved && draft
        ? fillTemplate(template, resolved, { markMissing: draft.status === 'draft', headerRight: `${data.project.key} · ${data.project.client}` })
        : null,
    [template, resolved, data.project, draft],
  )
  const printable = useMemo(
    () => (template && resolved ? fillTemplate(template, resolved, { markMissing: false, headerRight: `${data.project.key} · ${data.project.client}` }).html : null),
    [template, resolved, data.project],
  )

  if (!doc || !draft) return <Notice tone="error">No existe ese documento.</Notice>
  if (!env || !schema || !auto || !resolved || !filled) return <Spinner label="Armando el documento…" />

  const def = DOCUMENTS[doc.code]
  const locked = draft.status !== 'draft'
  const name = fileBase(draft, data)
  const setField = (k: string, v: string | null) =>
    setDraft((d) => {
      if (!d) return d
      const fields = { ...d.overrides.fields }
      if (v === null) delete fields[k]
      else fields[k] = v
      return { ...d, overrides: { ...d.overrides, fields } }
    })
  const setList = (k: string, rows: Record<string, string>[] | null) =>
    setDraft((d) => {
      if (!d) return d
      const lists = { ...d.overrides.lists }
      if (rows === null) delete lists[k]
      else lists[k] = rows
      return { ...d, overrides: { ...d.overrides, lists } }
    })
  const toProject = async (kind: 'field' | 'list', k: string) => {
    const facts: DocData = structuredClone(data.project.facts ?? { fields: {}, lists: {} })
    if (kind === 'field') {
      facts.fields[k] = draft.overrides.fields[k]
      setField(k, null)
    } else {
      facts.lists[k] = draft.overrides.lists[k]
      setList(k, null)
    }
    await saver.run(() => updateProject({ ...data.project, facts }))
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(doc)
  const persist = (d: ProjectDocument) => saver.run(() => save('documents', d))

  const groups = new Map<string, typeof schema.scalars>()
  for (const f of schema.scalars) {
    if (onlyMissing && resolved.fields[f.name]) continue
    const g = f.name.split('.')[0]
    groups.set(g, [...(groups.get(g) ?? []), f])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to=".." relative="path" className="text-sm font-semibold text-accent">
            ← Documentos
          </Link>
          <Eyebrow>
            {doc.code} · {def.title} {contextLabel(doc, data) && `· ${contextLabel(doc, data)}`}
          </Eyebrow>
          <h2 className="text-lg font-bold break-all">{name}.pdf</h2>
          <p className="text-xs text-muted">
            Se guarda en {docFolder(draft, data)} · {DOCUMENT_STATUS[draft.status]}
            {draft.sentOn && ` · enviado el ${fmtDate(draft.sentOn)}`}
            {draft.signedOn && ` · firmado el ${fmtDate(draft.signedOn)}`}
            {draft.status === 'draft' && ` · ${filled.missing.length} campos sin dato`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked && (
            <Button variant="primary" disabled={!dirty || saver.busy} onClick={() => void persist(draft)}>
              Guardar
            </Button>
          )}
          <Button onClick={() => printable && printDocument(printable, name)}>Imprimir o guardar PDF</Button>
          {!locked && (
            <Button
              onClick={() => {
                if (filled.missing.length && !confirm(`Faltan ${filled.missing.length} campos. ¿Enviar así?`)) return
                void persist({ ...draft, status: 'sent', sentOn: todayInMexico(), snapshot: resolved })
              }}
            >
              Marcar como enviado
            </Button>
          )}
          {draft.status === 'sent' && <Button onClick={() => void persist({ ...draft, status: 'signed', signedOn: todayInMexico(), snapshot: draft.snapshot ?? resolved })}>Marcar como firmado</Button>}
          {locked && (
            <Button
              onClick={async () => {
                const same = data.documents.filter((d) => d.code === doc.code && sameContext(d.context, doc.context))
                const next: ProjectDocument = {
                  ...structuredClone(draft),
                  id: localId('doc'),
                  version: same.reduce((m, d) => Math.max(m, d.version), 0) + 1,
                  status: 'draft',
                  snapshot: null,
                  createdOn: todayInMexico(),
                  sentOn: null,
                  signedOn: null,
                }
                if (await persist(next)) navigate(`../${next.id}`, { relative: 'path' })
              }}
            >
              Nueva versión
            </Button>
          )}
          {!locked && (
            <Button variant="danger" onClick={() => confirm('¿Borrar este borrador?') && void saver.run(() => remove('documents', doc.id)).then((ok) => ok && navigate('..', { relative: 'path' }))}>
              Borrar
            </Button>
          )}
        </div>
      </div>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {locked && !draft.snapshot && (
        <Notice tone="warn">Este documento se registró sin congelar lo enviado: se muestra con los datos actuales del proyecto.</Notice>
      )}
      {locked && draft.snapshot && <Notice>Lo enviado quedó congelado: ya no cambia con los datos del proyecto. Para corregirlo, crea una nueva versión.</Notice>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {!locked && (
          <Card className="max-h-[80vh] overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex gap-1">
                {(['campos', 'listas'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold', tab === t ? 'bg-accent text-white' : 'text-ink2 hover:bg-soft')}>
                    {t === 'campos' ? 'Campos' : 'Listas'}
                  </button>
                ))}
              </div>
              {tab === 'campos' && (
                <label className="flex items-center gap-2 text-xs text-ink2">
                  <input type="checkbox" className="accent-accent" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
                  Solo los que faltan
                </label>
              )}
            </div>
            <p className="mb-3 text-xs text-muted">
              Gris: sale solo de los datos. Escribe encima para cambiarlo en este documento; «Al proyecto» lo guarda para todos los documentos del proyecto.
            </p>
            {tab === 'campos' ? (
              <div className="space-y-5">
                {[...groups.entries()].map(([g, fields]) => (
                  <div key={g}>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{g.replace(/_/g, ' ')}</div>
                    <div className="space-y-2.5">
                      {fields.map((f) => {
                        const src = fieldSource(draft, env, auto, f.name)
                        const value = draft.overrides.fields[f.name]
                        const base = (data.project.facts?.fields[f.name] ?? auto.fields[f.name]) || ''
                        return (
                          <div key={f.name}>
                            <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-ink2">{prettyField(f.name)}</span>
                              <span className="flex gap-2">
                                {src === 'document' && (
                                  <>
                                    <button type="button" className="font-semibold text-accent" onClick={() => void toProject('field', f.name)}>
                                      Al proyecto
                                    </button>
                                    <button type="button" className="text-muted hover:text-rojo" onClick={() => setField(f.name, null)}>
                                      Quitar
                                    </button>
                                  </>
                                )}
                                <span className={cx('rounded px-1.5', src === 'missing' ? 'bg-ambar-soft text-ambar' : src === 'auto' ? 'bg-soft text-muted' : 'bg-accent-soft text-accent-2')}>
                                  {{ document: 'documento', project: 'proyecto', auto: 'automático', missing: 'falta' }[src]}
                                </span>
                              </span>
                            </div>
                            <textarea
                              rows={Math.min(4, Math.max(1, Math.ceil(((value ?? base) || f.example).length / 48)))}
                              className="w-full rounded-lg border border-rule px-2.5 py-1.5 text-sm leading-snug placeholder:text-muted/60 focus:border-accent focus:outline-none"
                              value={value ?? ''}
                              placeholder={base || `Ejemplo: ${f.example}`}
                              onChange={(e) => setField(f.name, e.target.value)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {schema.lists
                  .filter((l) => !l.parent)
                  .map((l) => {
                    const own = draft.overrides.lists[l.name]
                    const rows = own ?? resolved.lists[l.name] ?? []
                    const fromProject = !own && data.project.facts?.lists[l.name]
                    return (
                      <div key={l.name} className="rounded-lg border border-rule p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{l.name.replace(/_/g, ' ')}</span>
                          <span className="flex gap-2 text-xs">
                            {own ? (
                              <>
                                <button type="button" className="font-semibold text-accent" onClick={() => void toProject('list', l.name)}>
                                  Al proyecto
                                </button>
                                <button type="button" className="text-muted hover:text-rojo" onClick={() => setList(l.name, null)}>
                                  Volver a lo automático
                                </button>
                              </>
                            ) : (
                              <button type="button" className="font-semibold text-accent" onClick={() => setList(l.name, structuredClone(rows))}>
                                Editar en este documento
                              </button>
                            )}
                            <span className="rounded bg-soft px-1.5 text-muted">{own ? 'documento' : fromProject ? 'proyecto' : 'automático'}</span>
                          </span>
                        </div>
                        {rows.length === 0 && <p className="text-xs text-muted">Sin renglones.</p>}
                        <div className="space-y-2">
                          {rows.map((row, i) => (
                            <div key={i} className="rounded-md bg-surface p-2">
                              {l.fields.map((f) => (
                                <input
                                  key={f.name}
                                  disabled={!own}
                                  className="mb-1 w-full rounded border border-rule bg-white px-2 py-1 text-xs disabled:bg-transparent disabled:text-ink2"
                                  placeholder={`${prettyField(f.name)} · p. ej. ${f.example.slice(0, 40)}`}
                                  value={row[f.name] ?? ''}
                                  onChange={(e) => setList(l.name, rows.map((r, j) => (j === i ? { ...r, [f.name]: e.target.value } : r)))}
                                />
                              ))}
                              {own && (
                                <button type="button" className="text-xs text-muted hover:text-rojo" onClick={() => setList(l.name, rows.filter((_, j) => j !== i))}>
                                  Quitar renglón
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {own && (
                          <button type="button" className="mt-2 text-xs font-semibold text-accent" onClick={() => setList(l.name, [...rows, {}])}>
                            + Agregar renglón
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </Card>
        )}
        <div className={cx(locked && 'xl:col-span-2')}>
          <DocPreview html={filled.html} title={name} />
        </div>
      </div>
    </div>
  )
}
