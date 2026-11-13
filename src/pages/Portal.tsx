import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, CalendarClock, Check, ChevronRight, CircleCheck, ClipboardList, Clock, Download, Eye, FileSignature, FileText, Flag, Gauge, LifeBuoy, MessageSquare, Paperclip, PenLine, Send } from 'lucide-react'
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
import { Badge, Button, Card, cx, Drawer, EmptyState, IconBox, KpiCard, LightBadge, Notice, PageHeader, SectionTitle, Spinner } from '../ui/kit'
import { useSaver } from './project/ctx'
import { openStoredFile } from '../ui/openFile'

const LIGHT_BY_TEXT: Record<string, 'green' | 'yellow' | 'red' | 'none'> = { Verde: 'green', Amarillo: 'yellow', Rojo: 'red' }

/** Lista de proyectos de un usuario del cliente con más de uno. */
export function PortalHome() {
  const { session } = useSession()
  const projects = session.status === 'client' ? session.projects : []
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader eyebrow="Portal del cliente" title="Sus proyectos" subtitle="Elijan un proyecto para ver su avance, firmar y descargar sus documentos." />
      <ul className="space-y-3">
        {projects.map((p) => (
          <li key={p.id}>
            <Link to={`/portal/${p.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-rule bg-white p-4 shadow-card transition-colors hover:border-accent-mid">
              <span>
                <span className="block text-[11px] font-bold tracking-wider text-accent">{p.key}</span>
                <span className="block font-semibold text-ink">{p.name}</span>
              </span>
              <ChevronRight className="size-5 text-muted" aria-hidden />
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

  const accepted = ms.filter((m) => m.actaDate).length
  const nextMs = ms.find((m) => !m.actaDate) ?? null
  const openPendings = data.pendings.filter((x) => !x.receivedOn)
  const light = last ? (LIGHT_BY_TEXT[last.fields['semaforo.color']] ?? 'none') : null
  const SECTIONS = [
    toSign.length > 0 && { id: 'firmar', label: 'Por firmar' },
    { id: 'avance', label: 'Avance' },
    { id: 'hitos', label: 'Hitos' },
    { id: 'pendientes', label: 'Pendientes' },
    { id: 'solicitudes', label: 'Solicitudes' },
    svc && { id: 'servicio', label: 'Servicio' },
    { id: 'documentos', label: 'Documentos' },
    pd.files.length > 0 && { id: 'archivos', label: 'Archivos' },
  ].filter(Boolean) as { id: string; label: string }[]

  return (
    <main className="pb-12">
      <div className="bg-navy text-white">
        <div className="mx-auto max-w-5xl px-4 pt-8 pb-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Portal del cliente · {p.key}</div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{p.name}</h1>
              <p className="mt-1 text-sm text-white/70">{p.client}</p>
            </div>
            {staff && (
              <Link to={`/p/${p.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15">
                <ArrowLeft className="size-4" aria-hidden />
                Volver al proyecto
              </Link>
            )}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroStat label="Hitos aceptados" value={`${accepted} de ${ms.length}`}>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-white" style={{ width: `${ms.length ? (accepted / ms.length) * 100 : 0}%` }} />
              </div>
            </HeroStat>
            <HeroStat label="Siguiente entrega" value={nextMs ? fmtDate(nextMs.forecastDelivery ?? nextMs.plannedDelivery) || 'Por fechar' : 'Todo entregado'}>
              {nextMs && <div className="mt-1 truncate text-xs text-white/60">{nextMs.title}</div>}
            </HeroStat>
            <HeroStat label="Por firmar" value={String(toSign.length)}>
              <div className="mt-1 text-xs text-white/60">{toSign.length ? 'Documentos esperando su firma' : 'Nada por firmar'}</div>
            </HeroStat>
            <HeroStat label="Lo que necesitamos" value={String(openPendings.length)}>
              <div className="mt-1 text-xs text-white/60">{openPendings.length ? 'Pendientes de su parte' : 'Nada pendiente'}</div>
            </HeroStat>
          </dl>
        </div>
      </div>
      <nav aria-label="Secciones" className="sticky top-14 z-20 border-b border-rule bg-white/95 backdrop-blur">
        <div className="scroll-fino mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {SECTIONS.map((x) => (
            <a key={x.id} href={`#${x.id}`} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-ink2 hover:bg-soft hover:text-ink">
              {x.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-5xl space-y-8 px-4 pt-6 sm:px-6">
        {(preview || staff) && <Notice tone="warn">Vista previa: así lo ve el cliente. {preview && 'Las acciones del cliente están desactivadas.'}</Notice>}
        {saver.error && <Notice tone="error">{saver.error}</Notice>}
        {sent && <Notice tone="success">{sent}</Notice>}

        {toSign.length > 0 && (
          <section id="firmar" className="scroll-mt-32">
            <SectionTitle icon={<FileSignature />} subtitle="Revísenlo y fírmenlo electrónicamente; queda la constancia con fecha, hora y huella del documento.">
              Por firmar
            </SectionTitle>
            <div className="space-y-3">
              {toSign.map((d) => (
                <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-accent-mid bg-accent-soft/40 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <IconBox tone="solid">
                      <FileSignature />
                    </IconBox>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink">
                        {d.code} · {DOCUMENTS[d.code].title} · versión {d.version}
                      </div>
                      <div className="mt-0.5 text-xs text-ink2">Enviado el {fmtDate(d.sentOn)}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(d.signers ?? []).map((s) => (
                          <Badge key={s.id} tone={signedBy(d, s) ? 'green' : 'gray'} icon={signedBy(d, s) ? <Check /> : <Clock />}>
                            {s.name}: {signedBy(d, s) ? 'firmó' : 'pendiente'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button icon={<Eye />} onClick={() => setDocOpen(d)}>
                      Revisar
                    </Button>
                    <Button variant="primary" icon={<PenLine />} disabled={preview} onClick={() => setSigning({ doc: d, signer: mineToSign(d)[0] })}>
                      Firmar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section id="avance" className="scroll-mt-32">
          <SectionTitle icon={<Gauge />} aside={light ? <LightBadge light={light} size="lg" /> : undefined}>
            Cómo va el proyecto
          </SectionTitle>
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
                      <div className="text-[11px] font-bold tracking-wider text-accent">{h['hito.numero']}</div>
                      <div className="font-semibold text-ink">{h['hito.nombre']}</div>
                      <div className="relative mt-3 h-2 rounded-full bg-soft">
                        <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.min(100, real)}%` }} />
                        <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: `${Math.min(100, plan)}%` }} title="Plan" />
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
                <Button className="mt-3" size="sm" variant="ghost" icon={<FileText />} onClick={() => setDocOpen(reports[0])}>
                  Ver el reporte completo
                </Button>
              )}
            </>
          ) : (
            <EmptyState icon={<CalendarClock />} title="El primer reporte semanal llega el viernes">
              Cada semana verán aquí el avance real contra el plan de cada hito.
            </EmptyState>
          )}
        </section>

        <section id="hitos" className="scroll-mt-32">
          <SectionTitle icon={<Flag />}>Hitos y aceptación</SectionTitle>
          <ol className="relative space-y-3 border-l-2 border-rule pl-6">
            {ms.map((m) => {
              const deadline = m.actualDelivery ? cal.workday(m.actualDelivery, p.params.clientReviewDays) : null
              const state = m.actaDate ? 'Aceptado' : m.actualDelivery ? 'En sus pruebas' : 'En construcción'
              const tone = m.actaDate ? 'green' : m.actualDelivery ? 'amber' : 'gray'
              const crit = data.criteria.filter((c) => c.milestoneId === m.id)
              return (
                <li key={m.id} className="relative">
                  <span
                    className={cx(
                      'absolute top-4 -left-[2.05rem] grid size-5 place-items-center rounded-full ring-4 ring-surface',
                      m.actaDate ? 'bg-verde text-white' : m.actualDelivery ? 'bg-ambar text-white' : 'border-2 border-rule bg-white',
                    )}
                    aria-hidden
                  >
                    {m.actaDate && <Check className="size-3" />}
                  </span>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold tracking-wider text-accent">{data.segments.find((s) => s.id === m.segmentId)?.name}</div>
                        <div className="font-semibold text-ink">{m.title}</div>
                        {m.result && <div className="text-sm text-ink2">{m.result}</div>}
                      </div>
                      <Badge tone={tone} dot>
                        {state}
                      </Badge>
                    </div>
                    <div className="num mt-2 text-xs text-muted">
                      Fecha planeada {fmtDate(m.plannedDelivery) || '—'}
                      {m.actualDelivery && ` · entregado el ${fmtDate(m.actualDelivery)}`}
                      {m.actaDate && ` · aceptado el ${fmtDate(m.actaDate)}${m.clientRating ? `, calificación ${m.clientRating}` : ''}`}
                    </div>
                    {m.actualDelivery && !m.actaDate && (
                      <div className="mt-3 rounded-lg border border-ambar/25 bg-ambar-soft/40 p-3">
                        <p className="text-sm text-ink">
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
                </li>
              )
            })}
          </ol>
        </section>

        <section id="pendientes" className="scroll-mt-32">
          <SectionTitle icon={<ClipboardList />} subtitle="Cada día hábil de espera recorre un día hábil la fecha prevista de los hitos que dependen de ello.">
            Lo que necesitamos de ustedes
          </SectionTitle>
          {openPendings.length === 0 ? (
            <EmptyState icon={<Check />} title="Nada pendiente">
              Gracias: tenemos todo lo que necesitamos de su parte.
            </EmptyState>
          ) : (
            <Card className="divide-y divide-rule">
              {openPendings.map((x) => {
                const late = x.dueOn && x.dueOn < today ? cal.networkDays(x.dueOn, today) - 1 : 0
                return (
                  <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span>
                      <span className="font-semibold text-ink">{x.description}</span>
                      <span className="block text-xs text-muted">
                        {contactName(x.contactId)} · compromiso {fmtDate(x.dueOn)}
                      </span>
                    </span>
                    <Badge tone={late > 0 ? 'red' : 'gray'}>{late > 0 ? `${late} días hábiles de atraso` : 'A tiempo'}</Badge>
                  </div>
                )
              })}
            </Card>
          )}
        </section>

        <section id="solicitudes" className="scroll-mt-32 grid gap-6 lg:grid-cols-2">
          <div>
            <SectionTitle icon={<MessageSquare />}>Sus solicitudes</SectionTitle>
            <Card className="divide-y divide-rule">
              {data.changes.length === 0 && <p className="p-4 text-sm text-muted">Sin solicitudes.</p>}
              {[...data.changes]
                .sort((a, b) => b.seq - a.seq)
                .map((c) => {
                  const waiting = c.kind === 'scope_change' && (c.status === 'waiting_client' || c.status === 'in_review')
                  return (
                    <div key={c.id} className="px-4 py-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="num text-xs font-bold text-accent">
                          {folio.change(c.seq)} · {fmtDate(c.date)}
                        </span>
                        {c.status && <Badge tone={waiting ? 'amber' : 'gray'}>{REQUEST_STATUS[c.status]}</Badge>}
                      </div>
                      <div className="mt-1 text-ink">{c.description}</div>
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
            <SectionTitle icon={<Send />}>Pedir algo</SectionTitle>
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
                icon={<Send />}
                disabled={preview || text.trim().length < 3}
                loading={saver.busy}
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
          <section id="servicio" className="scroll-mt-32">
            <SectionTitle icon={<LifeBuoy />}>Servicio de este mes</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <KpiCard label="Bolsa de horas" value={`${fmtHours(svc.pool.used)} de ${fmtHours(svc.pool.total)} h`} hint={`${fmtHours(svc.pool.available)} h disponibles; las no usadas ${p.params.unusedHoursRule}.`} icon={<Clock />} />
              <KpiCard
                label="Solicitudes"
                value={svc.requests.length}
                hint={`${svc.urgent.received} urgentes · ${svc.normal.received} normales · ${svc.urgent.open + svc.normal.open} abiertas`}
                icon={<MessageSquare />}
              />
              <Card className="p-4">
                <div className="text-[13px] font-semibold text-muted">Rutinas</div>
                <ul className="mt-2 space-y-1 text-xs">
                  {svc.routines
                    .filter((r) => r.routine.frequency !== 'continuous')
                    .map((r) => (
                      <li key={r.routine.id} className="flex justify-between gap-2">
                        <span className="text-ink2">{r.routine.name}</span>
                        <span className="num font-semibold text-ink">
                          {r.done}/{r.expected}
                        </span>
                      </li>
                    ))}
                </ul>
              </Card>
            </div>
          </section>
        )}

        <section id="documentos" className="scroll-mt-32">
          <SectionTitle icon={<FileText />}>Documentos</SectionTitle>
          {data.documents.length === 0 ? (
            <EmptyState icon={<FileText />} title="Todavía no hay documentos enviados" />
          ) : (
            <Card className="divide-y divide-rule">
              {[...data.documents]
                .sort((a, b) => (b.sentOn ?? '').localeCompare(a.sentOn ?? ''))
                .map((d) => (
                  <button key={d.id} type="button" onClick={() => setDocOpen(d)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent-soft/40">
                    <span className="flex min-w-0 items-center gap-3">
                      <IconBox size="sm">
                        <FileText />
                      </IconBox>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">
                          {d.code} · {DOCUMENTS[d.code].title}
                        </span>
                        <span className="block truncate text-xs text-muted">{fileBase(d, data)}.pdf</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {d.status === 'signed' && (
                        <Badge tone="green" icon={<Check />}>
                          Firmado
                        </Badge>
                      )}
                      <span className="num text-xs text-muted">{fmtDate(d.signedOn ?? d.sentOn)}</span>
                    </span>
                  </button>
                ))}
            </Card>
          )}
        </section>
        {pd.files.length > 0 && (
          <section id="archivos" className="scroll-mt-32">
            <SectionTitle icon={<Paperclip />}>Archivos</SectionTitle>
            <Card className="divide-y divide-rule">
              {pd.files.map((f) => (
                <FileRow key={f.id} file={f} />
              ))}
            </Card>
          </section>
        )}
      </div>
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

function HeroStat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{label}</dt>
      <dd className="num mt-1 text-lg font-bold">{value}</dd>
      {children}
    </div>
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
      <Button variant="primary" icon={<CircleCheck />} disabled={disabled || !rating} onClick={() => rating && onAccept(Number(rating), comment)}>
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
      <span className="flex min-w-0 items-center gap-3">
        <IconBox size="sm">
          <Paperclip />
        </IconBox>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{file.name}</span>
          <span className="block text-xs text-muted">{fmtDate(file.uploadedOn)}</span>
        </span>
      </span>
      <Button size="sm" icon={<Download />} loading={saver.busy} onClick={() => void saver.run(() => openStoredFile(repo, file))}>
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
    <Drawer open wide onClose={close} title={`${doc.code} · ${DOCUMENTS[doc.code].title}`} subtitle={`${name}.pdf`}>
      {!snapshot ? (
        <Notice tone="warn">Este documento se registró sin su versión enviada.</Notice>
      ) : html ? (
        <div className="space-y-3">
          <Button variant="primary" icon={<Download />} onClick={() => printDocument(html, name)}>
            Descargar PDF
          </Button>
          <DocPreview html={html} title={name} />
        </div>
      ) : (
        <Spinner />
      )}
    </Drawer>
  )
}
