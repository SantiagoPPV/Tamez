import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { CHANNEL, REQUEST_KIND, REQUEST_STATUS, ROUTINE_FREQUENCY, URGENCY, options } from '../../domain/catalogs'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate, fmtHours, folio } from '../../domain/format'
import { fmtMinutes, monthlyService, monthsBetween } from '../../domain/service'
import type { ChangeRequest, Routine, RoutineRun } from '../../domain/types'
import { monthName } from '../../docs/text'
import { Check, DateField, FormGrid, FormSection, SelectField, TextArea, TextField } from '../../ui/fields'
import { Alert, Button, Card, cx, DataTable, Drawer, Notice, SectionTitle, Stat } from '../../ui/kit'
import { names, useDraft, useP, useSaver } from './ctx'

/** Fecha y hora local «AAAA-MM-DDTHH:mm» en México. */
function nowMx(): string {
  const now = new Date()
  const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  return `${todayInMexico(now)}T${hhmm}`
}

export function ServicePage() {
  const { data, save } = useP()
  const navigate = useNavigate()
  const n = names(data)
  const p = data.project.params
  const today = todayInMexico()
  const start = (p.serviceStart ?? today).slice(0, 7)
  const months = monthsBetween(start, (today > `${start}-01` ? today : `${start}-01`).slice(0, 7)).reverse()
  const [month, setMonth] = useState<string>(months[0] ?? start)
  const s = useMemo(() => monthlyService(data, month), [data, month])
  const req = useDraft<ChangeRequest>()
  const rut = useDraft<Routine>()
  const run = useDraft<RoutineRun>()
  const saver = useSaver()

  const newRequest = (): ChangeRequest => ({
    id: localId('chg'),
    seq: 0,
    date: today,
    channel: 'email',
    requestedById: data.contacts.find((c) => c.roleKey === 'responsible')?.id ?? null,
    description: '',
    kind: 'minor_adjustment',
    hours: null,
    amount: null,
    segmentId: null,
    businessDaysMoved: null,
    billing: 'pool',
    status: 'in_review',
    decidedById: null,
    responseDate: null,
    recordedIn: '',
    baselineNote: '',
    service: true,
    urgency: 'normal',
    receivedAt: nowMx(),
    firstResponseAt: null,
    resolvedAt: null,
  })

  async function createD09() {
    const same = data.documents.filter((d) => d.code === 'D09' && d.context.month === month)
    const doc = {
      id: localId('doc'),
      code: 'D09' as const,
      version: same.reduce((m, d) => Math.max(m, d.version), 0) + 1,
      status: 'draft' as const,
      context: { month },
      overrides: { fields: {}, lists: {} },
      snapshot: null,
      createdOn: today,
      sentOn: null,
      signedOn: null,
      notes: '',
    }
    if (await saver.run(() => save('documents', doc))) navigate(`../documentos/${doc.id}`, { relative: 'path' })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl text-sm text-ink2">
          <p>
            Mensualidad de {p.monthlyFee ? `$${p.monthlyFee.toLocaleString('es-MX')}` : '—'} desde el {fmtDate(p.serviceStart) || '—'}, con {fmtHours(p.monthlyPoolHours)} horas
            al mes. Urgente: primera respuesta en {p.urgentResponseHours} h en horario hábil y {p.urgentResponseOffHours} fuera; solución en {p.urgentSolutionHours} h. Normal:
            respuesta en {p.normalResponseDays} día hábil y solución en {p.normalSolutionDays}.
          </p>
          <p className="mt-1 text-xs text-muted">
            Cada solicitud va a la bitácora de cambios (D13) marcada «servicio»; sus horas se capturan en la bitácora de trabajo con su folio. Los ajustes y mejoras
            descuentan de la bolsa; los defectos en garantía no.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <SelectField className="w-48" label="Mes" value={month} onChange={(v) => v && setMonth(v)} options={months.map((m) => ({ value: m, label: monthName(m) }))} allowEmpty={false} />
          <Button onClick={() => void createD09()}>Generar la D09</Button>
        </div>
      </div>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}

      <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <Stat label="Urgentes" value={s.urgent.received} hint={s.urgent.received ? `Respuesta más larga: ${fmtMinutes(s.urgent.maxResponse)}` : 'Ninguna'} />
        <Stat label="Normales" value={s.normal.received} hint={s.normal.received ? `Respuesta más larga: ${fmtMinutes(s.normal.maxResponse, true)}` : 'Ninguna'} />
        <Stat label="Bolsa del mes" value={`${fmtHours(s.pool.used)} de ${fmtHours(s.pool.total)} h`} hint={`${fmtHours(s.pool.available)} h disponibles`} />
        <Stat label="Defectos en garantía" value={s.warrantyDefects.length} hint="Sin cargo a la bolsa" />
      </Card>

      <section>
        <SectionTitle aside={<Button variant="primary" onClick={() => req.setDraft(newRequest())}>Nueva solicitud</Button>}>Solicitudes del mes</SectionTitle>
        <DataTable
          rows={s.requests}
          rowKey={(t) => t.change.id}
          onRowClick={(t) => req.setDraft(structuredClone(t.change))}
          empty="Sin solicitudes en el mes."
          columns={[
            { label: 'Folio', render: (t) => <span className="num font-semibold">{t.folio}</span> },
            { label: 'Llegó', className: 'num whitespace-nowrap', render: (t) => `${fmtDate(t.change.receivedAt?.slice(0, 10))} ${t.change.receivedAt?.slice(11, 16) ?? ''}` },
            {
              label: 'Qué pide',
              render: (t) => (
                <div className="min-w-[14rem]">
                  {t.change.description}
                  <div className="text-xs text-muted">
                    {n.contact(t.change.requestedById)} · {t.change.kind ? REQUEST_KIND[t.change.kind] : 'Sin clasificar'}
                    {t.warranty && ' · en garantía'}
                  </div>
                </div>
              ),
            },
            { label: 'Tipo', render: (t) => <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', t.urgent ? 'bg-rojo-soft text-rojo' : 'bg-soft text-ink2')}>{t.urgent ? 'Urgente' : 'Normal'}</span> },
            { label: 'Respuesta', render: (t) => <Timing min={t.responseMinutes} ok={t.responseOk} business={!t.urgent} /> },
            { label: 'Solución', render: (t) => <Timing min={t.solutionMinutes} ok={t.solutionOk} business={!t.urgent} /> },
            { label: 'Estado', render: (t) => (t.change.status ? REQUEST_STATUS[t.change.status] : '') },
          ]}
          card={(t) => (
            <div>
              <div className="flex justify-between text-xs font-bold text-accent">
                <span>{t.folio}</span>
                <span>{t.urgent ? 'Urgente' : 'Normal'}</span>
              </div>
              <div className="text-sm">{t.change.description}</div>
              <div className="text-xs text-muted">
                Respuesta {fmtMinutes(t.responseMinutes, !t.urgent)} · solución {fmtMinutes(t.solutionMinutes, !t.urgent)}
              </div>
            </div>
          )}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle>Uso de la bolsa de horas</SectionTitle>
          <Card className="divide-y divide-rule text-sm">
            {s.pool.uses.length === 0 && <p className="p-4 text-muted">Sin horas de la bolsa en el mes.</p>}
            {s.pool.uses.map((u) => (
              <div key={u.folio} className="flex justify-between gap-3 px-4 py-2">
                <span>
                  <span className="num font-semibold">{u.folio}</span> {u.description}
                  <span className="block text-xs text-muted">
                    {fmtDate(u.from)}
                    {u.to !== u.from && ` al ${fmtDate(u.to)}`}
                  </span>
                </span>
                <span className="num font-bold">{fmtHours(u.hours)} h</span>
              </div>
            ))}
          </Card>
          <p className="mt-2 text-xs text-muted">Horas no usadas: {p.unusedHoursRule}. Cuando se acaba la bolsa, Soporte avisa al responsable del cliente y Venta y cuenta cotiza lo siguiente.</p>
        </div>
        <div>
          <SectionTitle aside={<Button size="sm" onClick={() => rut.setDraft({ id: localId('rut'), name: '', frequency: 'monthly', ownerId: null, reviewer: '', evidenceHint: '', active: true })}>Agregar rutina</Button>}>
            Rutinas del mes
          </SectionTitle>
          <Card className="divide-y divide-rule">
            {s.routines.map((x) => (
              <div key={x.routine.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <button type="button" className="min-w-0 text-left" onClick={() => rut.setDraft(structuredClone(x.routine))}>
                  <div className="font-semibold">{x.routine.name}</div>
                  <div className="text-xs text-muted">
                    {ROUTINE_FREQUENCY[x.routine.frequency]} · {n.member(x.routine.ownerId) || 'sin responsable'}
                    {x.last && ` · última ${fmtDate(x.last.date)}`}
                    {x.nextDue && ` · siguiente ${fmtDate(x.nextDue)}`}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  {x.routine.frequency !== 'continuous' && (
                    <span className={cx('num rounded-full px-2 py-0.5 text-xs font-semibold', x.done >= x.expected ? 'bg-accent-soft text-accent-2' : 'bg-ambar-soft text-ambar')}>
                      {x.done} de {x.expected}
                    </span>
                  )}
                  <Button size="sm" onClick={() => run.setDraft({ id: localId('run'), routineId: x.routine.id, date: today, done: true, evidence: '', notes: '' })}>
                    Registrar
                  </Button>
                </div>
              </div>
            ))}
          </Card>
          <p className="mt-2 text-xs text-muted">Una rutina no hecha se reporta así en la D09, con su nueva fecha.</p>
        </div>
      </section>

      {req.draft && <RequestForm draft={req.draft} set={req.set} close={() => req.setDraft(null)} />}
      {rut.draft && (
        <Drawer
          open
          onClose={() => rut.setDraft(null)}
          title={rut.draft.name || 'Rutina'}
          footer={
            <div className="flex gap-2">
              <Button variant="primary" disabled={!rut.draft.name.trim()} onClick={() => void saver.run(() => save('routines', rut.draft!)).then((ok) => ok && rut.setDraft(null))}>
                Guardar
              </Button>
              <Button onClick={() => rut.setDraft(null)}>Cancelar</Button>
            </div>
          }
        >
          <FormGrid>
            <TextField className="sm:col-span-2" label="Rutina" value={rut.draft.name} onChange={(v) => rut.set('name', v)} />
            <SelectField label="Frecuencia" value={rut.draft.frequency} onChange={(v) => v && rut.set('frequency', v)} options={options(ROUTINE_FREQUENCY)} allowEmpty={false} />
            <SelectField label="Quién" value={rut.draft.ownerId} onChange={(v) => rut.set('ownerId', v)} options={n.memberOptions} />
            <TextField label="Revisa o aprueba" value={rut.draft.reviewer} onChange={(v) => rut.set('reviewer', v)} />
            <TextField label="Evidencia" value={rut.draft.evidenceHint} onChange={(v) => rut.set('evidenceHint', v)} />
            <Check checked={rut.draft.active} onChange={(v) => rut.set('active', v)} label="Activa" />
          </FormGrid>
        </Drawer>
      )}
      {run.draft && (
        <Drawer
          open
          onClose={() => run.setDraft(null)}
          title={`Registrar: ${data.routines.find((x) => x.id === run.draft!.routineId)?.name ?? ''}`}
          subtitle="Cada rutina del mes lleva fecha, responsable y evidencia"
          footer={
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => void saver.run(() => save('routineRuns', run.draft!)).then((ok) => ok && run.setDraft(null))}>
                Guardar
              </Button>
              <Button onClick={() => run.setDraft(null)}>Cancelar</Button>
            </div>
          }
        >
          <FormGrid>
            <DateField label="Fecha" value={run.draft.date} onChange={(v) => v && run.set('date', v)} />
            <div className="sm:pt-7">
              <Check checked={run.draft.done} onChange={(v) => run.set('done', v)} label="Hecha (sin palomear = no se hizo; anota la nueva fecha)" />
            </div>
            <TextField className="sm:col-span-2" label="Evidencia o resultado" help={data.routines.find((x) => x.id === run.draft!.routineId)?.evidenceHint} value={run.draft.evidence} onChange={(v) => run.set('evidence', v)} />
            <TextArea className="sm:col-span-2" label="Notas" value={run.draft.notes} onChange={(v) => run.set('notes', v)} rows={2} />
          </FormGrid>
        </Drawer>
      )}
    </div>
  )
}

function Timing({ min, ok, business }: { min: number | null; ok: boolean | null; business: boolean }) {
  if (min == null) return <span className="text-xs text-muted">Pendiente</span>
  return <span className={cx('text-xs font-semibold whitespace-nowrap', ok ? 'text-accent-2' : 'text-rojo')}>{fmtMinutes(min, business)}</span>
}

function RequestForm({ draft, set, close }: { draft: ChangeRequest; set: <K extends keyof ChangeRequest>(k: K, v: ChangeRequest[K]) => void; close: () => void }) {
  const { data, result, save } = useP()
  const n = names(data)
  const saver = useSaver()
  const isNew = !data.changes.some((c) => c.id === draft.id)
  const alert = result.changes.get(draft.id)?.alert
  const dt = (label: string, k: 'receivedAt' | 'firstResponseAt' | 'resolvedAt', help?: string) => (
    <div>
      <label className="mb-1 block text-sm font-semibold text-ink2" htmlFor={`dt-${k}`}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={`dt-${k}`}
          type="datetime-local"
          className="h-10 w-full rounded-lg border border-rule px-3 text-sm focus:border-accent focus:outline-none"
          value={draft[k] ?? ''}
          onChange={(e) => set(k, e.target.value || null)}
        />
        {k !== 'receivedAt' && !draft[k] && (
          <Button size="sm" onClick={() => set(k, nowMx())}>
            Ahora
          </Button>
        )}
      </div>
      {help && <p className="mt-1 text-xs text-muted">{help}</p>}
    </div>
  )
  return (
    <Drawer
      open
      onClose={close}
      title={isNew ? 'Nueva solicitud de soporte' : `${folio.change(draft.seq)} · solicitud de soporte`}
      subtitle="Urgente: el sistema no funciona, o una falla detiene la operación o arriesga los datos"
      footer={
        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={saver.busy}
            onClick={() => {
              if (!draft.description.trim()) return saver.setError('Falta qué pide.')
              void saver.run(() => save('changes', { ...draft, date: draft.receivedAt?.slice(0, 10) ?? draft.date })).then((ok) => ok && close())
            }}
          >
            Guardar
          </Button>
          <Button onClick={close}>Cancelar</Button>
        </div>
      }
    >
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {alert && (
        <div className="mb-3">
          <Alert>{alert}</Alert>
        </div>
      )}
      <FormSection title="Qué pide">
        <FormGrid>
          <SelectField label="Tipo" value={draft.urgency ?? null} onChange={(v) => set('urgency', v)} options={options(URGENCY)} allowEmpty={false} />
          <SelectField label="Canal" value={draft.channel} onChange={(v) => set('channel', v)} options={options(CHANNEL)} />
          <SelectField className="sm:col-span-2" label="Quién lo pidió" value={draft.requestedById} onChange={(v) => set('requestedById', v)} options={n.contactOptions} />
          <TextArea className="sm:col-span-2" label="Qué pide" value={draft.description} onChange={(v) => set('description', v)} />
          <SelectField label="Clasificación" help="Defecto, ajuste o mejora (cambio de alcance)" value={draft.kind} onChange={(v) => set('kind', v)} options={options(REQUEST_KIND)} />
          <SelectField label="Estado" value={draft.status} onChange={(v) => set('status', v)} options={options(REQUEST_STATUS)} />
        </FormGrid>
      </FormSection>
      <FormSection title="Tiempos">
        <div className="space-y-4">
          {dt('Llegó', 'receivedAt')}
          {dt('Primera respuesta', 'firstResponseAt')}
          {dt('Solución o forma temporal de operar', 'resolvedAt', 'La urgente se documenta al cerrarla, como incidente con causa y acción.')}
        </div>
      </FormSection>
    </Drawer>
  )
}
