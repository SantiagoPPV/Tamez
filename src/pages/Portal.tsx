import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useRepo, useSession } from '../app/session'
import { clientSafe } from '../data/portalView'
import type { PortalData } from '../data/repository'
import { DOCUMENTS, REQUEST_KIND, REQUEST_STATUS } from '../domain/catalogs'
import { BusinessCalendar, todayInMexico } from '../domain/dates'
import { fmtDate, fmtHours, fmtMoney, folio } from '../domain/format'
import { monthlyService } from '../domain/service'
import type { DocData, ProjectDocument, Signature, Signer, StoredFile } from '../domain/types'
import { fileBase } from '../docs/autofill'
import { DocPreview, printDocument } from '../docs/DocPreview'
import { renderDocument } from '../docs/render'
import { dLongCap } from '../docs/text'
import { useFirm } from '../app/useGlobal'
import { SignDialog } from './project/Documents'
import { SelectField, TextArea } from '../ui/fields'
import { Button, Card, cx, Drawer, Empty, Eyebrow, LightBadge, Notice, SectionTitle, Spinner } from '../ui/kit'
import { useSaver } from './project/ctx'
import { openStoredFile } from '../ui/openFile'

const LIGHT_BY_TEXT: Record<string, 'green' | 'yellow' | 'red' | 'none'> = { Verde: 'green', Amarillo: 'yellow', Rojo: 'red' }

/** Lista de proyectos de un usuario del cliente con más de uno. */
export function PortalHome() {
  const { session } = useSession()
  const projects = session.status === 'client' ? session.projects : []
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Eyebrow>Portal del cliente</Eyebrow>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Sus proyectos</h1>
      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.id}>
            <Link to={`/portal/${p.id}`}>
              <Card className="p-4 hover:border-accent-mid">
                <div className="text-xs font-bold text-accent">{p.key}</div>
                <div className="font-semibold">{p.name}</div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

export function PortalPage() {
  const { projectId = '' } = useParams()
  const repo = useRepo()
  const { session } = useSession()
  const staff = session.status === 'ready'
  // Un socio en Supabase no tiene acceso al portal: ve una vista previa con la misma regla.
  const preview = staff && repo.mode === 'supabase'
  const [pd, setPd] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try {
      if (preview) {
        const full = await repo.loadProject(projectId)
        const me = full.contacts.find((c) => c.roleKey === 'responsible') ?? full.contacts[0] ?? null
        const files = (await repo.listGlobal('files')).filter((f) => f.projectId === projectId && f.clientVisible)
        setPd({ data: clientSafe(full), me: { contactId: me?.id ?? null, email: me?.email ?? '', roleKey: me?.roleKey ?? null }, files })
      } else setPd(await repo.portalData(projectId))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [repo, projectId, preview])
  useEffect(() => {
    void load()
  }, [load])

  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Notice tone="error">{error}</Notice>
      </div>
    )
  if (!pd) return <Spinner />
  return <PortalView pd={pd} reload={load} preview={preview} staff={staff} />
}

function PortalView({ pd, reload, preview, staff }: { pd: PortalData; reload: () => Promise<void>; preview: boolean; staff: boolean }) {
  const repo = useRepo()
  const { data, me } = pd
  const p = data.project
  const today = todayInMexico()
  const cal = useMemo(() => new BusinessCalendar(p.nonWorkingDays), [p.nonWorkingDays])
  const saver = useSaver()
  const [kind, setKind] = useState<'change' | 'support'>('change')
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal')
  const [text, setText] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const [docOpen, setDocOpen] = useState<ProjectDocument | null>(null)
  const [signing, setSigning] = useState<{ doc: ProjectDocument; signer: Signer } | null>(null)
  const signedBy = (d: ProjectDocument, s: Signer) => data.signatures.some((x) => x.documentId === d.id && x.documentVersion === d.version && x.signerId === s.id)
  const mineToSign = (d: ProjectDocument) =>
    (d.signers ?? []).filter((s) => s.kind === 'client' && !signedBy(d, s) && (staff || repo.mode === 'demo' || s.email.toLowerCase() === me.email.toLowerCase()))
  const toSign = data.documents.filter((d) => d.status === 'sent' && mineToSign(d).length > 0)

  const reports = data.documents.filter((d) => d.code === 'D06' && d.snapshot).sort((a, b) => (b.sentOn ?? '').localeCompare(a.sentOn ?? ''))
  const last = reports[0]?.snapshot ?? null
  const contactName = (id: string | null) => data.contacts.find((c) => c.id === id)?.name ?? ''
  const ms = [...data.milestones].sort((a, b) => (a.plannedDelivery ?? '').localeCompare(b.plannedDelivery ?? ''))
  // El acta la firma la responsable del cliente (o quien decide y paga); un cambio con costo, solo quien decide y paga.
  const canAccept = staff ? !preview : me.roleKey === 'responsible' || me.roleKey === 'decides'
  const canDecide = staff ? !preview : me.roleKey === 'decides'
  const serviceOn = Boolean(p.params.serviceStart && p.params.serviceStart <= today) || data.changes.some((c) => c.service)
  const month = today.slice(0, 7)
  const svc = useMemo(() => (serviceOn ? monthlyService(data, month) : null), [data, serviceOn, month])
  const act = (fn: () => Promise<unknown>) => saver.run(async () => {
    await fn()
    await reload()
  })

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Portal del cliente</Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight">{p.name}</h1>
          <p className="text-sm text-muted">
            {p.client} · {p.key}
          </p>
        </div>
        {staff && (
          <Link to={`/p/${p.id}`} className="text-sm font-semibold text-accent">
            Volver al proyecto
          </Link>
        )}
      </div>
      {(preview || staff) && <Notice tone="warn">Vista previa: así lo ve el cliente. {preview && 'Las acciones del cliente están desactivadas.'}</Notice>}
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {sent && <Notice>{sent}</Notice>}

      {toSign.length > 0 && (
        <section>
          <SectionTitle>Por firmar</SectionTitle>
          <div className="space-y-2">
            {toSign.map((d) => (
              <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-ambar/40 p-4">
                <div>
                  <div className="font-semibold">
                    {d.code} · {DOCUMENTS[d.code].title} · versión {d.version}
                  </div>
                  <div className="text-xs text-muted">Enviado el {fmtDate(d.sentOn)} · {(d.signers ?? []).map((s) => `${s.name}: ${signedBy(d, s) ? 'firmó' : 'pendiente'}`).join(' · ')}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setDocOpen(d)}>Revisar</Button>
                  <Button variant="primary" disabled={preview} onClick={() => setSigning({ doc: d, signer: mineToSign(d)[0] })}>
                    Firmar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle aside={last ? <LightBadge light={LIGHT_BY_TEXT[last.fields['semaforo.color']] ?? 'none'} size="lg" /> : undefined}>Cómo va el proyecto</SectionTitle>
        {last ? (
          <>
            <p className="mb-3 text-sm text-muted">
              Reporte semanal {last.fields['reporte.numero']} · corte del {last.fields['reporte.fecha_corte']}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {(last.lists.hitos ?? []).map((h, i) => {
                const real = parseFloat(h['hito.avance_real'] ?? '0') || 0
                const plan = parseFloat(h['hito.avance_planeado'] ?? '0') || 0
                return (
                  <Card key={i} className="p-4">
                    <div className="text-xs font-bold text-accent">{h['hito.numero']}</div>
                    <div className="font-semibold">{h['hito.nombre']}</div>
                    <div className="relative mt-3 h-2 rounded-full bg-soft">
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.min(100, real)}%` }} />
                      <div className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: `${Math.min(100, plan)}%` }} title="Plan" />
                    </div>
                    <div className="mt-2 text-xs text-ink2">
                      {h['hito.avance_real']} real · {h['hito.avance_planeado']} plan · {h['hito.estado']}
                    </div>
                    <div className="text-xs text-muted">Fecha prevista: {h['hito.fecha_prevista']}</div>
                  </Card>
                )
              })}
            </div>
            {reports[0] && (
              <button type="button" className="mt-3 text-sm font-semibold text-accent" onClick={() => setDocOpen(reports[0])}>
                Ver el reporte completo
              </button>
            )}
          </>
        ) : (
          <Empty>El primer reporte semanal llega el viernes.</Empty>
        )}
      </section>

      <section>
        <SectionTitle>Hitos y aceptación</SectionTitle>
        <div className="space-y-3">
          {ms.map((m) => {
            const deadline = m.actualDelivery ? cal.workday(m.actualDelivery, p.params.clientReviewDays) : null
            const state = m.actaDate ? 'Aceptado' : m.actualDelivery ? 'En sus pruebas' : 'En construcción'
            const crit = data.criteria.filter((c) => c.milestoneId === m.id)
            return (
              <Card key={m.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-accent">{data.segments.find((s) => s.id === m.segmentId)?.name}</div>
                    <div className="font-semibold">{m.title}</div>
                    {m.result && <div className="text-sm text-ink2">{m.result}</div>}
                  </div>
                  <span className={cx('rounded-full px-2.5 py-0.5 text-sm font-semibold', m.actaDate ? 'bg-accent-soft text-accent-2' : m.actualDelivery ? 'bg-ambar-soft text-ambar' : 'bg-soft text-muted')}>{state}</span>
                </div>
                <div className="num mt-2 text-xs text-muted">
                  Fecha planeada {fmtDate(m.plannedDelivery) || '—'}
                  {m.actualDelivery && ` · entregado el ${fmtDate(m.actualDelivery)}`}
                  {m.actaDate && ` · aceptado el ${fmtDate(m.actaDate)}${m.clientRating ? `, calificación ${m.clientRating}` : ''}`}
                </div>
                {m.actualDelivery && !m.actaDate && (
                  <div className="mt-3 rounded-lg bg-surface p-3">
                    <p className="text-sm">
                      Revísenlo con el guion de casos. Tienen hasta el <b>{fmtDate(deadline)}</b> ({p.params.clientReviewDays} días hábiles); si el plazo vence sin
                      observaciones por escrito, el hito queda aceptado. Solo detiene el acta un defecto que impide cumplir un criterio.
                    </p>
                    {crit.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {crit.map((c) => (
                          <li key={c.id}>
                            <span className="num font-semibold">{c.code}</span> {c.action} → <span className="text-ink2">{c.expected}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <AcceptForm disabled={preview || !canAccept} onAccept={(rating, comment) => act(() => repo.portalAcceptMilestone(p.id, m.id, rating, comment))} />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Lo que necesitamos de ustedes</SectionTitle>
        {data.pendings.filter((x) => !x.receivedOn).length === 0 ? (
          <Empty>Nada pendiente. Gracias.</Empty>
        ) : (
          <Card className="divide-y divide-rule">
            {data.pendings
              .filter((x) => !x.receivedOn)
              .map((x) => {
                const late = x.dueOn && x.dueOn < today ? cal.networkDays(x.dueOn, today) - 1 : 0
                return (
                  <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span>
                      <span className="font-semibold">{x.description}</span>
                      <span className="block text-xs text-muted">
                        {contactName(x.contactId)} · compromiso {fmtDate(x.dueOn)}
                      </span>
                    </span>
                    <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', late > 0 ? 'bg-rojo-soft text-rojo' : 'bg-soft text-ink2')}>
                      {late > 0 ? `${late} días hábiles de atraso` : 'A tiempo'}
                    </span>
                  </div>
                )
              })}
          </Card>
        )}
        <p className="mt-2 text-xs text-muted">Cada día hábil de espera recorre un día hábil la fecha prevista de los hitos que dependen de ello.</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle>Sus solicitudes</SectionTitle>
          <Card className="divide-y divide-rule">
            {data.changes.length === 0 && <p className="p-4 text-sm text-muted">Sin solicitudes.</p>}
            {[...data.changes].sort((a, b) => b.seq - a.seq).map((c) => {
              const waiting = c.kind === 'scope_change' && (c.status === 'waiting_client' || c.status === 'in_review')
              return (
                <div key={c.id} className="px-4 py-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="num text-xs font-bold text-accent">
                      {folio.change(c.seq)} · {fmtDate(c.date)}
                    </span>
                    <span className="text-xs text-muted">{c.status ? REQUEST_STATUS[c.status] : ''}</span>
                  </div>
                  <div>{c.description}</div>
                  <div className="text-xs text-muted">
                    {c.service ? (c.urgency === 'urgent' ? 'Soporte urgente' : 'Soporte') : ''}
                    {c.kind ? `${c.service ? ' · ' : ''}${REQUEST_KIND[c.kind]}` : c.service ? '' : 'Por clasificar el mismo día'}
                    {c.amount ? ` · ${fmtMoney(c.amount)} más IVA` : ''}
                    {c.hours ? ` · ${fmtHours(c.hours)} h` : ''}
                  </div>
                  {waiting && (c.amount ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="primary" disabled={preview || !canDecide || saver.busy} onClick={() => void act(() => repo.portalDecideChange(p.id, c.id, true))}>
                        Aprobar el cambio
                      </Button>
                      <Button size="sm" disabled={preview || !canDecide || saver.busy} onClick={() => void act(() => repo.portalDecideChange(p.id, c.id, false))}>
                        No hacerlo
                      </Button>
                      {!canDecide && <span className="text-xs text-muted">Un cambio con costo lo aprueba quien decide y paga.</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        </div>
        <div>
          <SectionTitle>Pedir algo</SectionTitle>
          <Card className="space-y-3 p-4">
            <SelectField
              label="Qué necesitan"
              value={kind}
              onChange={(v) => v && setKind(v)}
              options={[
                { value: 'change', label: 'Un cambio o ajuste al proyecto' },
                { value: 'support', label: 'Soporte del sistema en operación' },
              ]}
              allowEmpty={false}
            />
            {kind === 'support' && (
              <SelectField
                label="Urgencia"
                help="Urgente: el sistema no funciona, o una falla detiene la operación o arriesga los datos. Para urgencias, llamen además al teléfono de guardia."
                value={urgency}
                onChange={(v) => v && setUrgency(v)}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'urgent', label: 'Urgente' },
                ]}
                allowEmpty={false}
              />
            )}
            <TextArea label="Descríbanlo con sus palabras" value={text} onChange={setText} rows={3} />
            <Button
              variant="primary"
              disabled={preview || text.trim().length < 3 || saver.busy}
              onClick={() =>
                void act(async () => {
                  const seq = await repo.portalRequest(p.id, text, kind === 'support', kind === 'support' ? urgency : null)
                  setText('')
                  setSent(`Recibimos su solicitud ${folio.change(seq)}. La clasificamos hoy: defecto, ajuste menor o cambio de alcance.`)
                })
              }
            >
              Enviar
            </Button>
          </Card>
        </div>
      </section>

      {svc && (
        <section>
          <SectionTitle>Servicio de este mes</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Bolsa de horas</div>
              <div className="num text-2xl font-extrabold">
                {fmtHours(svc.pool.used)} <span className="text-base font-semibold text-muted">de {fmtHours(svc.pool.total)} h</span>
              </div>
              <div className="text-xs text-muted">{fmtHours(svc.pool.available)} h disponibles; las no usadas {p.params.unusedHoursRule}.</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Solicitudes</div>
              <div className="num text-2xl font-extrabold">{svc.requests.length}</div>
              <div className="text-xs text-muted">
                {svc.urgent.received} urgentes · {svc.normal.received} normales · {svc.urgent.open + svc.normal.open} abiertas
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Rutinas</div>
              <ul className="mt-1 space-y-0.5 text-xs">
                {svc.routines
                  .filter((r) => r.routine.frequency !== 'continuous')
                  .map((r) => (
                    <li key={r.routine.id} className="flex justify-between gap-2">
                      <span>{r.routine.name}</span>
                      <span className="num font-semibold">
                        {r.done}/{r.expected}
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Documentos</SectionTitle>
        {data.documents.length === 0 ? (
          <Empty>Todavía no hay documentos enviados.</Empty>
        ) : (
          <Card className="divide-y divide-rule">
            {[...data.documents]
              .sort((a, b) => (b.sentOn ?? '').localeCompare(a.sentOn ?? ''))
              .map((d) => (
                <button key={d.id} type="button" onClick={() => setDocOpen(d)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-surface">
                  <span>
                    <span className="font-semibold">
                      {d.code} · {DOCUMENTS[d.code].title}
                    </span>
                    <span className="block text-xs text-muted">{fileBase(d, data)}.pdf</span>
                  </span>
                  <span className="text-xs text-muted">{fmtDate(d.signedOn ?? d.sentOn)}</span>
                </button>
              ))}
          </Card>
        )}
      </section>
      {pd.files.length > 0 && (
        <section>
          <SectionTitle>Archivos</SectionTitle>
          <Card className="divide-y divide-rule">
            {pd.files.map((f) => (
              <FileRow key={f.id} file={f} />
            ))}
          </Card>
        </section>
      )}
      {docOpen && (
        <DocViewer
          doc={docOpen}
          snapshot={docOpen.snapshot}
          name={fileBase(docOpen, data)}
          meta={{ projectKey: p.key, projectName: p.name, client: p.client }}
          signatures={data.signatures.filter((x) => x.documentId === docOpen.id && x.documentVersion === docOpen.version)}
          close={() => setDocOpen(null)}
        />
      )}
      {signing && <SignDialog doc={signing.doc} signer={signing.signer} mode="client" projectId={p.id} close={() => setSigning(null)} onDone={reload} />}
    </main>
  )
}

function AcceptForm({ disabled, onAccept }: { disabled: boolean; onAccept: (rating: number, comment: string) => void }) {
  const [rating, setRating] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
      <SelectField
        label="Calificación"
        value={rating}
        onChange={setRating}
        options={Array.from({ length: 10 }, (_, i) => ({ value: String(10 - i), label: String(10 - i) }))}
        placeholder="1 a 10"
      />
      <TextArea label="Comentario (opcional)" value={comment} onChange={setComment} rows={1} />
      <Button variant="primary" disabled={disabled || !rating} onClick={() => rating && onAccept(Number(rating), comment)}>
        Aceptar el hito
      </Button>
    </div>
  )
}

function FileRow({ file }: { file: StoredFile }) {
  const repo = useRepo()
  const saver = useSaver()
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span>
        <span className="font-semibold">{file.name}</span>
        <span className="block text-xs text-muted">{fmtDate(file.uploadedOn)}</span>
      </span>
      <Button size="sm" disabled={saver.busy} onClick={() => void saver.run(() => openStoredFile(repo, file))}>
        Descargar
      </Button>
    </div>
  )
}

function DocViewer({
  doc,
  snapshot,
  name,
  meta,
  signatures,
  close,
}: {
  doc: ProjectDocument
  snapshot: DocData | null
  name: string
  meta: { projectKey: string; projectName: string; client: string }
  signatures: Signature[]
  close: () => void
}) {
  const { firm } = useFirm()
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    if (!snapshot) return
    void renderDocument({
      code: doc.code,
      data: snapshot,
      firm,
      signers: doc.signers ?? [],
      signatures,
      hash: signatures[0]?.documentHash ?? null,
      meta: { firmName: firm.name, ...meta, version: doc.version, dateText: dLongCap(doc.signedOn ?? doc.sentOn ?? doc.createdOn), fileName: name },
    }).then((r) => setHtml(r.html))
  }, [doc, snapshot, meta, firm, signatures, name])
  return (
    <Drawer open onClose={close} title={`${doc.code} · ${DOCUMENTS[doc.code].title}`} subtitle={`${name}.pdf`}>
      {!snapshot ? (
        <Notice tone="warn">Este documento se registró sin su versión enviada.</Notice>
      ) : html ? (
        <div className="space-y-3">
          <Button onClick={() => printDocument(html, name)}>Descargar PDF</Button>
          <DocPreview html={html} title={name} />
        </div>
      ) : (
        <Spinner />
      )}
    </Drawer>
  )
}
