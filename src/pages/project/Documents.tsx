import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useRepo } from '../../app/session'
import { useFirm, useGlobal } from '../../app/useGlobal'
import { createShare } from '../../app/lifecycle'
import { CLIENT_ROLE, DOCUMENTS, DOCUMENT_STATUS } from '../../domain/catalogs'
import { diffDays, todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate, folio } from '../../domain/format'
import { getFormat } from '../../domain/formats'
import { monthsBetween } from '../../domain/service'
import type { DocContext, DocData, DocumentCode, PortalAccess, ProjectData, ProjectDocument, Signer } from '../../domain/types'
import { autofill, docFolder, fieldSource, fileBase, resolveDoc, type DocEnv } from '../../docs/autofill'
import { DocPreview, printDocument } from '../../docs/DocPreview'
import { templateSchema, type TemplateSchema, loadTemplate } from '../../docs/engine'
import { formatAutofill } from '../../docs/formatAuto'
import { formatDefOf, renderDocument } from '../../docs/render'
import { dLongCap, monthName } from '../../docs/text'
import { mailHtml, sendMail } from '../../data/services'
import { SelectField, TextArea, TextField } from '../../ui/fields'
import { SignaturePad } from '../../ui/SignaturePad'
import { Button, Card, cx, Drawer, Eyebrow, Notice, SectionTitle, Spinner } from '../../ui/kit'
import { useP, useSaver } from './ctx'
import { useAsk, useConfirm } from '../../ui/feedback'

const STAGES: { title: string; codes: DocumentCode[] }[] = [
  { title: 'Preventa', codes: ['D15', 'D16', 'D01', 'D10'] },
  { title: 'Inicio y planeación', codes: ['D02', 'D17', 'D18', 'D03', 'D12'] },
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

/** Firmantes que proponemos: quien decide y paga, y quien firma por el despacho. */
export function defaultSigners(data: ProjectData, firm: { signerName?: string; signerEmail?: string; signerRole?: string; name: string }): Signer[] {
  const decides = data.contacts.find((c) => c.roleKey === 'decides')
  return [
    ...(decides ? [{ id: localId('sgn'), kind: 'client' as const, name: decides.name, email: decides.email ?? '', role: 'Por el cliente: decide y paga', contactId: decides.id }] : []),
    { id: localId('sgn'), kind: 'firm' as const, name: firm.signerName || 'Santiago', email: firm.signerEmail ?? '', role: `Por ${firm.name || 'el despacho'}${firm.signerRole ? `: ${firm.signerRole}` : ''}`, contactId: null },
  ]
}

export function DocumentsPage() {
  const { data, save } = useP()
  const { firm } = useFirm()
  const navigate = useNavigate()
  const [creating, setCreating] = useState<DocumentCode | null>(null)
  const saver = useSaver()

  async function create(code: DocumentCode, context: DocContext) {
    const same = data.documents.filter((d) => d.code === code && sameContext(d.context, context))
    const version = same.reduce((m, d) => Math.max(m, d.version), 0) + 1
    const prev = [...same].sort((a, b) => b.version - a.version)[0]
    const fmt = DOCUMENTS[code].format
    const overrides: DocData = prev
      ? structuredClone(prev.overrides)
      : { fields: fmt === 'D17' || fmt === 'D18' ? formatAutofill(fmt, data) : {}, lists: {} }
    const doc: ProjectDocument = {
      id: localId('doc'),
      code,
      version,
      status: 'draft',
      context,
      overrides,
      snapshot: null,
      createdOn: todayInMexico(),
      sentOn: null,
      signedOn: null,
      notes: '',
      signers: prev?.signers?.map((s) => ({ ...s, id: localId('sgn') })) ?? (code === 'D02' || code === 'D03' || code === 'D08' ? defaultSigners(data, firm) : []),
    }
    const ok = await saver.run(() => save('documents', doc))
    if (ok) navigate(doc.id)
  }

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm text-ink2">
        Los documentos se generan, no se redactan: cada paso trae su formato y sus preguntas base, y lo demás sale de los datos del proyecto. La versión sube con
        cada envío, lo enviado queda congelado y lo firmado lleva su constancia de firma electrónica.
      </p>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {STAGES.map((stage) => (
        <section key={stage.title}>
          <SectionTitle>{stage.title}</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stage.codes.map((code) => {
              const def = DOCUMENTS[code]
              const docs = data.documents.filter((d) => d.code === code).sort((a, b) => (a.createdOn === b.createdOn ? b.version - a.version : b.createdOn.localeCompare(a.createdOn)))
              const creatable = def.template || def.format
              return (
                <Card key={code} className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-accent">{code}</div>
                      <div className="font-semibold">{def.title}</div>
                      <div className="text-xs text-muted">
                        {def.client ? 'Lo ve el cliente' : 'Interno'} · lo prepara {def.prepares}
                        {def.format ? ' · formato con preguntas base' : ''}
                      </div>
                    </div>
                    {creatable ? (
                      <Button size="sm" onClick={() => (def.context === 'none' ? void create(code, {}) : setCreating(code))}>
                        Nuevo
                      </Button>
                    ) : (
                      <Link to={`../imprimir/${code.toLowerCase()}`} className="text-sm font-semibold text-accent">
                        Ver e imprimir
                      </Link>
                    )}
                  </div>
                  {!creatable && <p className="mt-2 text-xs text-muted">Es una vista del módulo de control.</p>}
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

/** HTML del documento (vista previa o impresión), con la constancia de firmas. */
function useRendered(doc: ProjectDocument | null, data: ProjectData, resolved: DocData | null, markMissing: boolean) {
  const { firm } = useFirm()
  const [out, setOut] = useState<{ html: string; missing: string[] } | null>(null)
  const signatures = useMemo(() => (doc ? data.signatures.filter((s) => s.documentId === doc.id && s.documentVersion === doc.version) : []), [doc, data.signatures])
  useEffect(() => {
    let alive = true
    if (!doc || !resolved) return
    void renderDocument({
      code: doc.code,
      data: resolved,
      firm,
      markMissing,
      signers: doc.signers ?? [],
      signatures,
      hash: signatures[0]?.documentHash ?? null,
      meta: {
        firmName: firm.name,
        projectKey: data.project.key,
        projectName: data.project.name,
        client: data.project.client,
        version: doc.version,
        dateText: dLongCap(doc.signedOn ?? doc.sentOn ?? doc.createdOn),
        fileName: fileBase(doc, data),
      },
    }).then((r) => alive && setOut(r))
    return () => {
      alive = false
    }
  }, [doc, resolved, data, firm, markMissing, signatures])
  return out
}

export function DocumentEditor() {
  const { docId = '' } = useParams()
  const { data, save, remove, updateProject, reload } = useP()
  const navigate = useNavigate()
  const ask = useAsk()
  const confirm = useConfirm()
  const env = useDocEnv(data)
  const { firm } = useFirm()
  const doc = data.documents.find((d) => d.id === docId) ?? null
  const def = doc ? DOCUMENTS[doc.code] : null
  const [template, setTemplate] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProjectDocument | null>(doc ? structuredClone(doc) : null)
  const [sharing, setSharing] = useState(false)
  const saver = useSaver()
  const repo = useRepo()

  useEffect(() => {
    if (doc) setDraft(structuredClone(doc))
  }, [doc])
  useEffect(() => {
    const name = doc ? DOCUMENTS[doc.code].template : null
    if (name) void loadTemplate(name).then(setTemplate)
  }, [doc])

  const resolved = useMemo(() => (draft && env ? resolveDoc(draft, env) : null), [draft, env])
  const preview = useRendered(draft, data, resolved, draft?.status === 'draft')
  const printable = useRendered(draft, data, resolved, false)

  if (!doc || !draft || !def) return <Notice tone="error">No existe ese documento.</Notice>
  if (!env || !resolved || !preview) return <Spinner label="Armando el documento…" />

  const isFormat = Boolean(def.format)
  const locked = draft.status !== 'draft'
  const name = fileBase(draft, data)
  const dirty = JSON.stringify(draft) !== JSON.stringify(doc)
  const persist = (d: ProjectDocument) => saver.run(() => save('documents', d))
  const signers = draft.signers ?? []
  const clientSigners = signers.filter((s) => s.kind === 'client')

  /** Congela lo enviado (con la definición del formato, para que no cambie después). */
  const freeze = (): DocData => {
    const snap = structuredClone(resolved)
    if (isFormat) snap.fields.__def = JSON.stringify(formatDefOf(draft.code, resolved, firm))
    return snap
  }

  async function send(forSignature: boolean) {
    if (
      preview!.missing.length &&
      !(await confirm({
        title: `Faltan ${preview!.missing.length} datos`,
        body: 'Lo que falta sale vacío en el documento enviado. Puedes llenarlo primero o enviarlo así.',
        confirmLabel: 'Enviar así',
        cancelLabel: 'Llenar primero',
        tone: 'warn',
      }))
    )
      return
    if (forSignature && clientSigners.some((s) => !s.email.includes('@'))) return saver.setError('Cada firmante del cliente necesita su correo.')
    const sent: ProjectDocument = { ...draft!, status: 'sent', sentOn: todayInMexico(), snapshot: freeze() }
    const ok = await persist(sent)
    if (!ok || !forSignature) return
    // Acceso al portal por correo para quien firma por el cliente.
    for (const s of clientSigners) {
      if (data.portalAccess.some((a) => a.email.toLowerCase() === s.email.toLowerCase())) continue
      const acc: PortalAccess = { id: localId('acc'), userId: null, contactId: s.contactId ?? null, email: s.email.toLowerCase() }
      await saver.run(() => save('portalAccess', acc))
    }
    if (clientSigners.length) {
      const url = `${window.location.origin}/portal/${data.project.id}`
      const text = `Hola:\n\nYa está listo para su firma «${def!.title}» del proyecto ${data.project.name || data.project.key}.\n\nEntre al portal con su correo (${clientSigners.map((s) => s.email).join(', ')}), revíselo y fírmelo electrónicamente:\n${url}\n\nGracias.\n${firm.name}`
      await saver.run(() => sendMail(repo, { to: clientSigners.map((s) => s.email), subject: `Para firma: ${def!.title} · ${data.project.key}`, text, html: mailHtml(text) }))
    }
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
            {draft.status === 'draft' && ` · ${preview.missing.length} datos sin capturar`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked && (
            <Button variant="primary" disabled={!dirty || saver.busy} onClick={() => void persist(draft)}>
              Guardar
            </Button>
          )}
          <Button onClick={() => printable && printDocument(printable.html, name)}>Imprimir o guardar PDF</Button>
          {!locked && signers.length > 0 && (
            <Button variant="primary" disabled={saver.busy} onClick={() => void send(true)}>
              Enviar para firma
            </Button>
          )}
          {!locked && (
            <Button disabled={saver.busy} onClick={() => void send(false)}>
              {signers.length ? 'Enviar sin firma' : 'Marcar como enviado'}
            </Button>
          )}
          {locked && (
            <Button onClick={() => setSharing(true)}>{draft.status === 'signed' ? 'Enviar firmado a varios correos' : 'Enviar por correo'}</Button>
          )}
          {draft.status === 'sent' && !signers.length && (
            <Button onClick={() => void persist({ ...draft, status: 'signed', signedOn: todayInMexico(), snapshot: draft.snapshot ?? resolved })}>Marcar como firmado</Button>
          )}
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
                  signers: (draft.signers ?? []).map((s) => ({ ...s, id: localId('sgn') })),
                }
                if (await persist(next)) navigate(`../${next.id}`, { relative: 'path' })
              }}
            >
              Nueva versión
            </Button>
          )}
          {!locked && (
            <Button variant="danger" onClick={() => ask('¿Borrar este borrador?', () => saver.run(() => remove('documents', doc.id)).then((ok) => ok && navigate('..', { relative: 'path' })))}>
              Borrar
            </Button>
          )}
        </div>
      </div>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {locked && !draft.snapshot && <Notice tone="warn">Este documento se registró sin congelar lo enviado: se muestra con los datos actuales del proyecto.</Notice>}
      {locked && draft.snapshot && <Notice>Lo enviado quedó congelado: ya no cambia con los datos del proyecto. Para corregirlo, crea una nueva versión.</Notice>}

      <SignersPanel draft={draft} setDraft={setDraft} data={data} locked={locked} onSigned={reload} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {!locked &&
          (isFormat ? (
            <FormatFields draft={draft} setDraft={setDraft} data={data} />
          ) : (
            template && <TemplateFields template={template} draft={draft} setDraft={setDraft} env={env} resolved={resolved} data={data} updateProject={updateProject} saver={saver} />
          ))}
        <div className={cx(locked && 'xl:col-span-2')}>
          <DocPreview html={preview.html} title={name} />
        </div>
      </div>
      {sharing && <ShareDialog doc={draft} data={data} close={() => setSharing(false)} />}
    </div>
  )
}

/* --------------------------------------------------- formatos (D15–D18) */
function FormatFields({ draft, setDraft, data }: { draft: ProjectDocument; setDraft: (f: (d: ProjectDocument | null) => ProjectDocument | null) => void; data: ProjectData }) {
  const { firm } = useFirm()
  const fmt = DOCUMENTS[draft.code].format!
  const def = getFormat(firm, fmt)
  const set = (k: string, v: string) => setDraft((d) => (d ? { ...d, overrides: { ...d.overrides, fields: { ...d.overrides.fields, [k]: v } } } : d))
  const refill = () => {
    if (fmt !== 'D17' && fmt !== 'D18') return
    const auto = formatAutofill(fmt, data)
    setDraft((d) => {
      if (!d) return d
      const fields = { ...d.overrides.fields }
      for (const [k, v] of Object.entries(auto)) if (!fields[k]?.trim()) fields[k] = v
      return { ...d, overrides: { ...d.overrides, fields } }
    })
  }
  return (
    <Card className="max-h-[80vh] overflow-y-auto p-4">
      <p className="mb-3 text-xs text-muted">{def.intro}</p>
      {(fmt === 'D17' || fmt === 'D18') && (
        <Button size="sm" variant="ghost" onClick={refill}>
          Llenar lo vacío con los datos del proyecto
        </Button>
      )}
      {(fmt === 'D15' || fmt === 'D16') && (
        <TextArea className="mt-3" label="Resumen" rows={4} value={draft.overrides.fields.resumen ?? ''} onChange={(v) => set('resumen', v)} />
      )}
      <div className="mt-3 space-y-5">
        {def.sections.map((s, i) => (
          <div key={s.id}>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              {i + 1}. {s.title}
            </div>
            <div className="space-y-2.5">
              {s.questions.map((q) =>
                q.kind === 'date' ? (
                  <TextField key={q.id} label={q.label} value={draft.overrides.fields[q.id] ?? ''} onChange={(v) => set(q.id, v)} placeholder="AAAA-MM-DD" />
                ) : q.kind === 'yesno' ? (
                  <SelectField
                    key={q.id}
                    label={q.label}
                    value={(draft.overrides.fields[q.id] as 'yes' | 'no' | 'pending' | undefined) ?? null}
                    onChange={(v) => set(q.id, v ?? '')}
                    options={[
                      { value: 'yes', label: 'Sí' },
                      { value: 'no', label: 'No' },
                      { value: 'pending', label: 'Por confirmar' },
                    ]}
                  />
                ) : (
                  <TextArea key={q.id} label={`${q.label}${q.required ? ' *' : ''}`} rows={q.kind === 'long' ? 3 : 1} value={draft.overrides.fields[q.id] ?? ''} onChange={(v) => set(q.id, v)} />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------------------------------------------- plantillas (D01–D14) */
function TemplateFields({
  template,
  draft,
  setDraft,
  env,
  resolved,
  data,
  updateProject,
  saver,
}: {
  template: string
  draft: ProjectDocument
  setDraft: (f: (d: ProjectDocument | null) => ProjectDocument | null) => void
  env: DocEnv
  resolved: DocData
  data: ProjectData
  updateProject: ReturnType<typeof useP>['updateProject']
  saver: ReturnType<typeof useSaver>
}) {
  const [tab, setTab] = useState<'campos' | 'listas'>('campos')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const schema: TemplateSchema = useMemo(() => templateSchema(template), [template])
  const auto = useMemo(() => autofill(draft, env), [draft, env])
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
  const groups = new Map<string, typeof schema.scalars>()
  for (const f of schema.scalars) {
    if (onlyMissing && resolved.fields[f.name]) continue
    const g = f.name.split('.')[0]
    groups.set(g, [...(groups.get(g) ?? []), f])
  }
  return (
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
      <p className="mb-3 text-xs text-muted">Gris: sale solo de los datos. Escribe encima para cambiarlo en este documento; «Al proyecto» lo guarda para todos los documentos del proyecto.</p>
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
  )
}

/* ------------------------------------------------------------ firmas */
function SignersPanel({
  draft,
  setDraft,
  data,
  locked,
  onSigned,
}: {
  draft: ProjectDocument
  setDraft: (f: (d: ProjectDocument | null) => ProjectDocument | null) => void
  data: ProjectData
  locked: boolean
  onSigned: () => Promise<void>
}) {
  const { firm } = useFirm()
  const [signing, setSigning] = useState<Signer | null>(null)
  const signers = draft.signers ?? []
  const sigs = data.signatures.filter((s) => s.documentId === draft.id && s.documentVersion === draft.version)
  const set = (list: Signer[]) => setDraft((d) => (d ? { ...d, signers: list } : d))
  if (!locked && !signers.length && !DOCUMENTS[draft.code].client) return null
  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">Firma electrónica</h3>
        {!locked && (
          <div className="flex flex-wrap gap-2">
            {!signers.length && (
              <Button size="sm" onClick={() => set(defaultSigners(data, firm))}>
                Agregar firmantes
              </Button>
            )}
            {signers.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => set([...signers, { id: localId('sgn'), kind: 'client', name: '', email: '', role: 'Por el cliente', contactId: null }])}>
                + Firmante del cliente
              </Button>
            )}
          </div>
        )}
      </div>
      {!signers.length ? (
        <p className="text-sm text-muted">Sin firmantes: el documento se envía sin firma. Agrégalos para firmarlo dentro del sistema.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {signers.map((s, i) => {
            const sig = sigs.find((x) => x.signerId === s.id)
            return (
              <div key={s.id} className="rounded-lg border border-rule p-3">
                {!locked ? (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted">{s.kind === 'firm' ? 'Por el despacho' : 'Por el cliente'}</div>
                    {s.kind === 'client' && data.contacts.length > 0 && (
                      <SelectField
                        label="Persona del cliente"
                        value={s.contactId ?? null}
                        onChange={(v) => {
                          const c = data.contacts.find((x) => x.id === v)
                          set(signers.map((x, j) => (j === i ? { ...x, contactId: v, name: c?.name ?? x.name, email: c?.email ?? x.email, role: c ? `Por el cliente: ${c.roleKey ? CLIENT_ROLE[c.roleKey].toLowerCase() : c.role}` : x.role } : x)))
                        }}
                        options={data.contacts.map((c) => ({ value: c.id, label: c.name }))}
                      />
                    )}
                    <TextField label="Nombre" value={s.name} onChange={(v) => set(signers.map((x, j) => (j === i ? { ...x, name: v } : x)))} />
                    <TextField label="Correo con el que firma" value={s.email} onChange={(v) => set(signers.map((x, j) => (j === i ? { ...x, email: v.trim() } : x)))} />
                    <TextField label="Papel" value={s.role} onChange={(v) => set(signers.map((x, j) => (j === i ? { ...x, role: v } : x)))} />
                    <Button size="sm" variant="ghost" onClick={() => set(signers.filter((_, j) => j !== i))}>
                      Quitar firmante
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted">
                      {s.role} · {s.email || 'sin correo'}
                    </div>
                    {sig ? (
                      <div className="mt-2 text-sm font-semibold text-accent-2">
                        Firmó el {new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short' }).format(new Date(sig.signedAt))}
                        <div className="text-xs font-normal break-all text-muted">Huella {sig.documentHash.slice(0, 16)}…</div>
                      </div>
                    ) : draft.status === 'sent' ? (
                      s.kind === 'firm' ? (
                        <Button className="mt-2" size="sm" variant="primary" onClick={() => setSigning(s)}>
                          Firmar por el despacho
                        </Button>
                      ) : (
                        <p className="mt-2 text-sm text-ambar">Pendiente: firma en el portal con su correo.</p>
                      )
                    ) : (
                      <p className="mt-2 text-sm text-muted">Sin firma.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {signing && <SignDialog doc={draft} signer={signing} close={() => setSigning(null)} onDone={onSigned} mode="firm" projectId={data.project.id} />}
    </Card>
  )
}

/** Firma: nombre completo, trazo opcional y aceptación expresa. */
export function SignDialog({
  doc,
  signer,
  close,
  onDone,
  mode,
  projectId,
}: {
  doc: ProjectDocument
  signer: Signer
  close: () => void
  onDone: () => Promise<void> | void
  mode: 'firm' | 'client'
  projectId: string
}) {
  const repo = useRepo()
  const [name, setName] = useState(signer.name)
  const [drawing, setDrawing] = useState<string | null>(null)
  const [agree, setAgree] = useState(false)
  const saver = useSaver()
  return (
    <Drawer
      open
      onClose={close}
      title={`Firmar ${doc.code} · ${DOCUMENTS[doc.code].title}`}
      subtitle={`Versión ${doc.version} · ${signer.role}`}
      footer={
        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={!agree || name.trim().length < 3 || saver.busy}
            onClick={() =>
              void saver
                .run(async () => {
                  if (mode === 'firm') await repo.signAsFirm(projectId, doc.id, signer.id, name, drawing)
                  else await repo.portalSign(projectId, doc.id, signer.id, name, drawing)
                })
                .then(async (ok) => {
                  if (ok) {
                    await onDone()
                    close()
                  }
                })
            }
          >
            Firmar electrónicamente
          </Button>
          <Button onClick={close}>Cancelar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {saver.error && <Notice tone="error">{saver.error}</Notice>}
        <TextField label="Nombre completo" value={name} onChange={setName} />
        <SignaturePad onChange={setDrawing} />
        <label className="flex items-start gap-2 text-sm text-ink2">
          <input type="checkbox" className="mt-1 accent-accent" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            Revisé esta versión del documento y la acepto. Entiendo que esta firma electrónica queda registrada con mi nombre, mi correo verificado, la fecha y la hora, y la
            huella del documento.
          </span>
        </label>
      </div>
    </Drawer>
  )
}

/* ----------------------------------------- enviar con liga a varios correos */
function ShareDialog({ doc, data, close }: { doc: ProjectDocument; data: ProjectData; close: () => void }) {
  const repo = useRepo()
  const { firm } = useFirm()
  const def = DOCUMENTS[doc.code]
  const initial = [...new Set([...(doc.signers ?? []).map((s) => s.email), ...data.contacts.map((c) => c.email ?? '')].filter((x) => x.includes('@')))].join(', ')
  const [to, setTo] = useState(initial)
  const [note, setNote] = useState(doc.status === 'signed' ? `Les compartimos ${def.title.toLowerCase()} firmada por las dos partes.` : `Les compartimos ${def.title.toLowerCase()}.`)
  const [result, setResult] = useState<string | null>(null)
  const saver = useSaver()
  const shares = useGlobal('shares')
  const sent = (shares.rows ?? []).filter((s) => s.documentId === doc.id)
  const today = todayInMexico()
  const emails = to.split(/[,;\s]+/).filter((x) => x.includes('@'))
  return (
    <Drawer
      open
      onClose={close}
      title={`Enviar ${doc.code} por correo`}
      subtitle="Cada quien recibe una liga para verlo y descargarlo, sin entrar al sistema. La liga vence en 60 días."
      footer={
        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={!emails.length || saver.busy}
            onClick={() =>
              void saver.run(async () => {
                const url = await createShare(repo, {
                  projectId: data.project.id,
                  documentId: doc.id,
                  proposalId: null,
                  code: doc.code,
                  title: `${def.title} · ${data.project.key}`,
                  snapshot: doc.snapshot ?? { fields: {}, lists: {} },
                  signers: doc.signers ?? [],
                  meta: { version: doc.version, dateText: dLongCap(doc.signedOn ?? doc.sentOn ?? doc.createdOn), fileName: fileBase(doc, data), firmName: firm.name, projectName: data.project.name, client: data.project.client, projectKey: data.project.key },
                })
                const text = `Hola:\n\n${note}\n\n${def.title} · ${data.project.name || data.project.key} (versión ${doc.version}):\n${url}\n\nSaludos,\n${firm.name}`
                const r = await sendMail(repo, { to: emails, subject: `${def.title} · ${data.project.key}`, text, html: mailHtml(text) })
                setResult(r.via === 'server' ? `Enviado a ${emails.length} correo${emails.length > 1 ? 's' : ''}.` : 'Se abrió tu programa de correo con el mensaje listo.')
                await shares.reload()
              })
            }
          >
            Enviar
          </Button>
          <Button onClick={close}>Cerrar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {saver.error && <Notice tone="error">{saver.error}</Notice>}
        {result && <Notice tone="success">{result}</Notice>}
        <TextArea label="Para (correos separados por coma)" rows={2} value={to} onChange={setTo} />
        <TextArea label="Mensaje" rows={3} value={note} onChange={setNote} />
        {sent.length > 0 && (
          <div>
            <div className="mb-1 text-sm font-semibold text-ink2">Ligas enviadas</div>
            <ul className="divide-y divide-rule rounded-lg border border-rule text-sm">
              {sent.map((s) => {
                const active = !s.revoked && s.expiresOn >= today
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span>
                      Del {fmtDate(s.createdOn)} · {s.revoked ? 'revocada' : active ? `vence el ${fmtDate(s.expiresOn)}` : 'vencida'}
                    </span>
                    {active && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={saver.busy}
                        onClick={() =>
                          void saver.run(async () => {
                            await repo.saveGlobal('shares', { ...s, revoked: true })
                            await shares.reload()
                          })
                        }
                      >
                        Revocar
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="mt-1 text-xs text-muted">Una liga revocada deja de abrir de inmediato, también para quien ya la recibió.</p>
          </div>
        )}
      </div>
    </Drawer>
  )
}
