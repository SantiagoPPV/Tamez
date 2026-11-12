import { useMemo, useState } from 'react'
import {
  ACTIVITY_STATUS,
  ACTIVITY_TYPE,
  BLOCKS,
  DEVIATION_CAUSE,
  INTERNAL_REVIEW,
  LEVEL,
  QUALITY_LISTS,
  ROW_CLASS,
  options,
} from '../../domain/catalogs'
import { folio as folioOf, fmtDate, fmtHours } from '../../domain/format'
import { localId, newWbsItem } from '../../domain/factory'
import type { Milestone, WbsItem } from '../../domain/types'
import { Check, DateField, FormGrid, FormSection, NumberField, SelectField, TextField } from '../../ui/fields'
import { Alert, Button, cx, DataTable, Drawer, Notice } from '../../ui/kit'
import { names, useDraft, useP, useSaver } from './ctx'

const STATUS_STYLE: Record<string, string> = {
  todo: 'bg-soft text-muted',
  in_progress: 'bg-ambar-soft text-ambar',
  in_review: 'bg-accent-soft text-accent-2',
  done: 'bg-accent text-white',
}

export function WbsPage() {
  const { data, result } = useP()
  const n = names(data)
  const [segment, setSegment] = useState<string | null>(null)
  const [owner, setOwner] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [onlyAlerts, setOnlyAlerts] = useState(false)
  const [q, setQ] = useState('')
  const edit = useDraft<WbsItem>()
  const editMs = useDraft<Milestone>()

  const segments = [...data.segments].sort((a, b) => a.position - b.position)
  const rows = useMemo(() => {
    const text = q.trim().toLowerCase()
    return [...data.wbs]
      .sort((a, b) => a.position - b.position)
      .filter(
        (w) =>
          (!segment || w.segmentId === segment) &&
          (!owner || w.ownerId === owner) &&
          (!status || w.status === status) &&
          (!onlyAlerts || result.wbs.get(w.id)?.alert) &&
          (!text || `${w.key} ${w.name} ${w.deliverable}`.toLowerCase().includes(text)),
      )
  }, [data.wbs, segment, owner, status, onlyAlerts, q, result.wbs])

  const newItem = () => {
    const pos = Math.max(0, ...data.wbs.map((w) => w.position)) + 1
    edit.setDraft(newWbsItem({ position: pos, segmentId: segment ?? segments[1]?.id ?? segments[0]?.id ?? null, ownerId: owner }))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField className="w-full sm:w-48" label="Hito o tramo" value={segment} onChange={setSegment} options={n.segmentOptions} placeholder="Todos" />
        <SelectField className="w-[calc(50%-0.375rem)] sm:w-40" label="Responsable" value={owner} onChange={setOwner} options={n.memberOptions} placeholder="Todos" />
        <SelectField className="w-[calc(50%-0.375rem)] sm:w-40" label="Estado" value={status} onChange={setStatus} options={options(ACTIVITY_STATUS)} placeholder="Todos" />
        <TextField className="w-full sm:w-56" label="Buscar" value={q} onChange={setQ} placeholder="Clave, nombre o entregable" />
        <div className="pb-2.5">
          <Check checked={onlyAlerts} onChange={setOnlyAlerts} label="Solo con alerta" />
        </div>
        <div className="flex-1" />
        <Button variant="primary" onClick={newItem}>
          Agregar renglón
        </Button>
      </div>

      {segments
        .filter((s) => !segment || s.id === segment)
        .map((s) => {
          const segRows = rows.filter((w) => w.segmentId === s.id)
          const ms = data.milestones.find((m) => m.segmentId === s.id)
          const sp = result.segments.find((x) => x.segmentId === s.id)
          if (!segRows.length && !ms && (owner || status || onlyAlerts || q)) return null
          return (
            <section key={s.id}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-bold">{s.name}</h2>
                {sp && (
                  <span className="num text-xs text-muted">
                    {fmtHours(sp.earned)} de {fmtHours(sp.plannedHours)} h ganadas · {fmtHours(sp.realHours)} h reales · {fmtHours(sp.remaining)} h por terminar
                  </span>
                )}
              </div>
              {ms && (
                <MilestoneStrip ms={ms} onEdit={() => editMs.setDraft(structuredClone(ms))} />
              )}
              <WbsTable rows={segRows} onOpen={(w) => edit.setDraft(structuredClone(w))} />
            </section>
          )
        })}
      {rows.some((w) => !w.segmentId) && (
        <section>
          <h2 className="mb-2 text-base font-bold">Sin tramo</h2>
          <WbsTable rows={rows.filter((w) => !w.segmentId)} onOpen={(w) => edit.setDraft(structuredClone(w))} />
        </section>
      )}

      {edit.draft && <WbsForm draft={edit.draft} set={edit.set} close={() => edit.setDraft(null)} />}
      {editMs.draft && <MilestoneForm draft={editMs.draft} set={editMs.set} close={() => editMs.setDraft(null)} />}
    </div>
  )
}

function MilestoneStrip({ ms, onEdit }: { ms: Milestone; onEdit: () => void }) {
  const { result } = useP()
  const c = result.milestones.get(ms.id)
  return (
    <button
      type="button"
      onClick={onEdit}
      className="mb-2 flex w-full flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-accent-mid bg-accent-soft/60 px-4 py-2.5 text-left text-sm hover:border-accent"
    >
      <span className="font-bold text-accent-2">
        {ms.key} · {ms.title}
      </span>
      <span className="num text-ink2">
        Planeada {fmtDate(ms.plannedDelivery) || '—'} · prevista {fmtDate(ms.forecastDelivery) || '—'} · real {fmtDate(ms.actualDelivery) || '—'}
      </span>
      {c?.deviation != null && <span className="num text-ink2">Desviación {c.deviation} d. háb.</span>}
      {c?.acceptanceDeadline && <span className="num text-ink2">Límite de aceptación {fmtDate(c.acceptanceDeadline)}</span>}
      {c?.alert && <Alert>{c.alert}</Alert>}
    </button>
  )
}

function WbsTable({ rows, onOpen }: { rows: WbsItem[]; onOpen: (w: WbsItem) => void }) {
  const { data, result } = useP()
  const n = names(data)
  const calc = (w: WbsItem) => result.wbs.get(w.id)
  const statusBadge = (w: WbsItem) =>
    w.status ? (
      <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', STATUS_STYLE[w.status])}>{ACTIVITY_STATUS[w.status]}</span>
    ) : null
  return (
    <DataTable
      rows={rows}
      rowKey={(w) => w.id}
      onRowClick={onOpen}
      empty="Sin renglones en este tramo."
      rowClassName={(w) => (w.rowClass === 'deliverable' ? 'bg-surface font-semibold' : undefined)}
      columns={[
        { label: 'Clave', render: (w) => <span className="num font-semibold whitespace-nowrap">{w.key}</span> },
        {
          label: 'Actividad',
          render: (w) => (
            <div className="min-w-[14rem]">
              <div>{w.name}</div>
              <div className="text-xs text-muted">
                {w.rowClass !== 'activity' && `${ROW_CLASS[w.rowClass]} · `}
                {w.activityType ? ACTIVITY_TYPE[w.activityType] : ''}
                {w.correctionBudget && ' · horas para corregir'}
                {w.changeFolio && ` · ${w.changeFolio}`}
              </div>
              <Alert>{calc(w)?.alert}</Alert>
            </div>
          ),
        },
        { label: 'Responsable', render: (w) => <span className="whitespace-nowrap">{n.member(w.ownerId)}</span> },
        { label: 'Est.', className: 'num text-right', headClassName: 'text-right', render: (w) => fmtHours(w.estimatedHours) },
        { label: 'Planeada', className: 'num whitespace-nowrap', render: (w) => fmtDate(w.plannedDate) },
        {
          label: 'Por terminar',
          className: 'num text-right',
          headClassName: 'text-right',
          // Terminada al corte: ya no falta nada (la hoja guarda ahí sus horas estimadas para la suma de lo que falta).
          render: (w) => (calc(w)?.progress === 1 ? fmtHours(0) : fmtHours(calc(w)?.remainingCurrent ?? null)),
        },
        { label: 'Reales', className: 'num text-right', headClassName: 'text-right', render: (w) => fmtHours(calc(w)?.totalRealHours ?? null) },
        { label: 'Estado', render: statusBadge },
        {
          label: 'Avance',
          className: 'text-right',
          headClassName: 'text-right',
          render: (w) => (calc(w)?.isActivity ? <span className="num font-bold">{calc(w)?.progress === 1 ? '100 %' : '0 %'}</span> : null),
        },
      ]}
      card={(w) => (
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="num mr-2 text-xs font-bold text-accent">{w.key}</span>
              <span className="font-semibold">{w.name}</span>
            </div>
            {statusBadge(w)}
          </div>
          <div className="num mt-1 text-xs text-muted">
            {n.member(w.ownerId)} · {fmtHours(w.estimatedHours)} h · {fmtDate(w.plannedDate)}
            {calc(w)?.isActivity && ` · ${calc(w)?.progress === 1 ? '100 %' : '0 %'}`}
          </div>
          <Alert>{calc(w)?.alert}</Alert>
        </div>
      )}
    />
  )
}

function WbsForm({ draft, set, close }: { draft: WbsItem; set: <K extends keyof WbsItem>(k: K, v: WbsItem[K]) => void; close: () => void }) {
  const { data, result, save, remove } = useP()
  const p = data.project.params
  const n = names(data)
  const saver = useSaver()
  const isNew = !data.wbs.some((w) => w.id === draft.id)
  const calc = result.wbs.get(draft.id)
  const baselineLocked = !!data.project.baselineSignedOn && !isNew && !draft.changeFolio
  const isAct = draft.rowClass !== 'deliverable'
  const list = draft.activityType ? QUALITY_LISTS[draft.activityType] : null
  const loggedHours = data.workLogs.filter((l) => l.activityKey === draft.key).length
  const scopeFolios = data.changes
    .filter((c) => c.kind === 'scope_change')
    .map((c) => ({ value: folioOf.change(c.seq), label: `${folioOf.change(c.seq)} · ${c.description.slice(0, 40)}` }))

  const toggle = (id: string, on: boolean) => {
    const next = on ? [...new Set([...draft.checklist, id])] : draft.checklist.filter((x) => x !== id)
    set('checklist', next)
    if (list) set('checklistComplete', list.items.every((_, i) => next.includes(String(i))))
  }

  const errors: string[] = []
  if (!draft.key.trim()) errors.push('La clave es obligatoria.')
  if (data.wbs.some((w) => w.id !== draft.id && w.key === draft.key.trim())) errors.push('Ya existe un renglón con esa clave.')
  if (draft.reviewerId && draft.reviewerId === draft.ownerId) errors.push('Nadie revisa su propio trabajo: elige a otra persona.')

  async function submit() {
    if (errors.length) return saver.setError(errors.join(' '))
    const ok = await saver.run(() => save('wbs', { ...draft, key: draft.key.trim() }))
    if (ok) close()
  }

  return (
    <Drawer
      open
      onClose={close}
      title={isNew ? 'Nuevo renglón del desglose' : `${draft.key} · ${draft.name}`}
      subtitle={calc?.isActivity ? `Avance ${calc.progress === 1 ? '100 %' : '0 %'}${calc.finishedOn ? ` · terminada el ${fmtDate(calc.finishedOn)}` : ''}` : undefined}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => void submit()} disabled={saver.busy}>
            {saver.busy ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button onClick={close}>Cancelar</Button>
          <div className="flex-1" />
          {!isNew && loggedHours === 0 && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`¿Borrar ${draft.key}? No tiene horas en la bitácora.`))
                  void saver.run(() => remove('wbs', draft.id)).then((ok) => ok && close())
              }}
            >
              Borrar
            </Button>
          )}
        </div>
      }
    >
      {saver.error && (
        <div className="mb-4">
          <Notice tone="error">{saver.error}</Notice>
        </div>
      )}
      {calc?.alert && (
        <div className="mb-4">
          <Notice tone="warn">{calc.alert}</Notice>
        </div>
      )}

      <FormSection title="Renglón">
        <FormGrid>
          <SelectField label="Clase" value={draft.rowClass} onChange={(v) => v && set('rowClass', v)} options={options(ROW_CLASS)} allowEmpty={false} />
          <TextField label="Clave" help="[tramo].[entregable]-A[nn], p. ej. 1.3-A02" value={draft.key} onChange={(v) => set('key', v)} required />
          <TextField className="sm:col-span-2" label="Nombre" help="El resultado de la actividad." value={draft.name} onChange={(v) => set('name', v)} />
          <SelectField label="Hito o tramo" value={draft.segmentId} onChange={(v) => set('segmentId', v)} options={n.segmentOptions} />
          <TextField label="Entregable" value={draft.deliverable} onChange={(v) => set('deliverable', v)} />
          <SelectField
            label="Bloque del desglose estándar"
            value={draft.block == null ? null : String(draft.block)}
            onChange={(v) => set('block', v ? Number(v) : null)}
            options={Object.entries(BLOCKS).map(([value, label]) => ({ value, label }))}
          />
          <SelectField label="Tipo de actividad" help="Define su lista de calidad." value={draft.activityType} onChange={(v) => set('activityType', v)} options={options(ACTIVITY_TYPE)} />
          <SelectField label="Nivel" value={draft.level} onChange={(v) => set('level', v)} options={options(LEVEL)} />
          <SelectField label="Responsable" value={draft.ownerId} onChange={(v) => set('ownerId', v)} options={n.memberOptions} />
        </FormGrid>
      </FormSection>

      <FormSection title="Línea base">
        {baselineLocked && (
          <p className="mb-3 text-xs text-muted">
            Línea base firmada el {fmtDate(data.project.baselineSignedOn)}: horas estimadas y fecha planeada solo cambian con un cambio de alcance aprobado (D05).
            Lo reestimado va en horas por terminar y fecha prevista.
          </p>
        )}
        <FormGrid>
          <NumberField
            label="Horas estimadas"
            value={draft.estimatedHours}
            onChange={(v) => set('estimatedHours', v)}
            disabled={baselineLocked}
            suffix="h"
            error={
              isAct && (draft.estimatedHours ?? 0) > p.maxActivityHours
                ? `Pasa del tope de ${p.maxActivityHours} h: parte la actividad.`
                : !isAct && draft.estimatedHours != null
                  ? 'Las horas van en las actividades.'
                  : undefined
            }
          />
          <DateField label="Fecha planeada de término" value={draft.plannedDate} onChange={(v) => set('plannedDate', v)} disabled={baselineLocked} />
          <SelectField
            label="Folio del cambio de alcance (AM)"
            help="El cambio aprobado que agregó este renglón."
            value={draft.changeFolio}
            onChange={(v) => set('changeFolio', v)}
            options={scopeFolios}
            placeholder="Ninguno"
          />
          <div className="sm:pt-7">
            <Check checked={draft.correctionBudget} onChange={(v) => set('correctionBudget', v)} label="Horas planeadas para corregir (AL)" />
          </div>
        </FormGrid>
      </FormSection>

      {isAct && (
        <>
          <FormSection title="Reestimación y estado">
            <FormGrid>
              <NumberField label="Horas por terminar" help="0 al terminar." value={draft.remainingHours} onChange={(v) => set('remainingHours', v)} suffix="h" />
              <DateField label="Fecha prevista" value={draft.forecastDate} onChange={(v) => set('forecastDate', v)} />
              <SelectField label="Estado" value={draft.status} onChange={(v) => set('status', v)} options={options(ACTIVITY_STATUS)} />
            </FormGrid>
          </FormSection>

          <FormSection title={list ? `Lista de calidad ${list.code} · ${ACTIVITY_TYPE[draft.activityType!]}` : 'Lista de calidad'}>
            {list ? (
              <div className="space-y-2.5">
                <p className="text-xs text-muted">La palomea quien construyó, al terminar. (E) = pide evidencia.</p>
                {list.items.map((item, i) => (
                  <Check key={i} checked={draft.checklist.includes(String(i))} onChange={(v) => toggle(String(i), v)} label={item} />
                ))}
                <p className={cx('pt-1 text-sm font-semibold', draft.checklistComplete ? 'text-accent' : 'text-muted')}>
                  Lista completa: {draft.checklistComplete ? 'Sí' : 'No'}
                </p>
              </div>
            ) : (
              <SelectField
                label="Lista completa"
                help="Elige el tipo de actividad para usar su lista."
                value={draft.checklistComplete == null ? null : draft.checklistComplete ? 'si' : 'no'}
                onChange={(v) => set('checklistComplete', v == null ? null : v === 'si')}
                options={[
                  { value: 'si', label: 'Sí' },
                  { value: 'no', label: 'No' },
                ]}
              />
            )}
          </FormSection>

          <FormSection title="Revisión interna">
            <div className="mb-4 space-y-2.5">
              {INTERNAL_REVIEW.map((item, i) => (
                <Check key={i} checked={draft.checklist.includes(`r${i}`)} onChange={(v) => toggle(`r${i}`, v)} label={item} />
              ))}
            </div>
            <FormGrid>
              <SelectField
                label="Quién revisó"
                help="Nadie aprueba su propio trabajo."
                value={draft.reviewerId}
                onChange={(v) => set('reviewerId', v)}
                options={n.memberOptions.filter((m) => m.value !== draft.ownerId)}
              />
              <DateField label="Fecha de revisión" value={draft.reviewDate} onChange={(v) => set('reviewDate', v)} />
              <NumberField label="Defectos en revisión interna" value={draft.internalDefects} onChange={(v) => set('internalDefects', v == null ? null : Math.max(0, Math.round(v)))} />
            </FormGrid>
          </FormSection>

          <FormSection title="Término">
            <FormGrid>
              <DateField label="Fecha real de término" value={draft.actualEndDate} onChange={(v) => set('actualEndDate', v)} />
              <TextField label="Enlace a la evidencia" value={draft.evidence} onChange={(v) => set('evidence', v)} />
            </FormGrid>
            <p className="mt-3 text-xs text-muted">
              Vale 100 % con la lista completa, la revisión de otra persona con fecha y la fecha real; cuenta la más tardía de las dos.
            </p>
          </FormSection>

          {calc && !isNew && (
            <FormSection title="Calculado al corte">
              <dl className="num grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted">Horas reales</dt>
                  <dd className="font-bold">{fmtHours(calc.totalRealHours)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Planeada (calibra)</dt>
                  <dd className="font-bold">{fmtHours(calc.plannedClassHours)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Retrabajo</dt>
                  <dd className="font-bold">{fmtHours(calc.rework)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Terminado el</dt>
                  <dd className="font-bold">{fmtDate(calc.finishedOn) || '—'}</dd>
                </div>
              </dl>
            </FormSection>
          )}
        </>
      )}
    </Drawer>
  )
}

export function MilestoneForm({ draft, set, close }: { draft: Milestone; set: <K extends keyof Milestone>(k: K, v: Milestone[K]) => void; close: () => void }) {
  const { data, result, save, remove } = useP()
  const n = names(data)
  const saver = useSaver()
  const isNew = !data.milestones.some((m) => m.id === draft.id)
  const c = result.milestones.get(draft.id)
  async function submit() {
    if (!draft.key.trim()) return saver.setError('La clave del hito es obligatoria (H1, H2…).')
    const ok = await saver.run(() => save('milestones', { ...draft, key: draft.key.trim() }))
    if (ok) close()
  }
  return (
    <Drawer
      open
      onClose={close}
      title={isNew ? 'Nuevo hito' : `${draft.key} · ${draft.title}`}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void submit()} disabled={saver.busy}>
            Guardar
          </Button>
          <Button onClick={close}>Cancelar</Button>
          <div className="flex-1" />
          {!isNew && (
            <Button variant="danger" onClick={() => confirm('¿Borrar el hito?') && void saver.run(() => remove('milestones', draft.id)).then((ok) => ok && close())}>
              Borrar
            </Button>
          )}
        </div>
      }
    >
      {saver.error && (
        <div className="mb-4">
          <Notice tone="error">{saver.error}</Notice>
        </div>
      )}
      {c?.alert && (
        <div className="mb-4">
          <Notice tone="warn">{c.alert}</Notice>
        </div>
      )}
      <FormSection title="Hito">
        <FormGrid>
          <TextField label="Clave" value={draft.key} onChange={(v) => set('key', v)} help="H1, H2…" />
          <SelectField label="Tramo" value={draft.segmentId} onChange={(v) => v && set('segmentId', v)} options={n.segmentOptions} allowEmpty={false} />
          <TextField className="sm:col-span-2" label="Nombre del hito" value={draft.title} onChange={(v) => set('title', v)} />
          <NumberField label="Monto del pago (sin IVA)" value={draft.paymentAmount} onChange={(v) => set('paymentAmount', v)} />
        </FormGrid>
      </FormSection>
      <FormSection title="Entrega a pruebas">
        <FormGrid>
          <DateField label="Planeada (línea base)" value={draft.plannedDelivery} onChange={(v) => set('plannedDelivery', v)} />
          <DateField label="Prevista" value={draft.forecastDelivery} onChange={(v) => set('forecastDelivery', v)} />
          <DateField label="Real" value={draft.actualDelivery} onChange={(v) => set('actualDelivery', v)} />
          <SelectField label="Causa de la desviación" value={draft.deviationCause} onChange={(v) => set('deviationCause', v)} options={options(DEVIATION_CAUSE)} />
        </FormGrid>
      </FormSection>
      <FormSection title="Aceptación">
        <FormGrid>
          <DateField label="Fecha del acta" value={draft.actaDate} onChange={(v) => set('actaDate', v)} />
          <NumberField
            label="Calificación del cliente (1 a 10)"
            value={draft.clientRating}
            onChange={(v) => set('clientRating', v == null ? null : Math.min(10, Math.max(1, Math.round(v))))}
          />
        </FormGrid>
        {c && (
          <p className="num mt-3 text-xs text-muted">
            Límite de aceptación {fmtDate(c.acceptanceDeadline) || '—'} · días para aceptar {c.daysToAccept ?? '—'} · desviación {c.deviation ?? '—'} días hábiles
            {c.clientDelayDays ? ` · retraso del cliente ${c.clientDelayDays} (prevista mínima ${fmtDate(c.minForecast)})` : ''}
          </p>
        )}
      </FormSection>
      <p className="text-xs text-muted">
        El cliente tiene {data.project.params.clientReviewDays} días hábiles para revisar y {data.project.params.fixVerifyDays} para verificar correcciones; si
        vence el plazo sin observaciones, el hito queda aceptado. Garantía: {data.project.params.warrantyDays} días naturales.
      </p>
    </Drawer>
  )
}

export function newMilestone(segmentId: string, key: string): Milestone {
  return {
    id: localId('ms'),
    segmentId,
    key,
    title: '',
    paymentAmount: null,
    plannedDelivery: null,
    forecastDelivery: null,
    actualDelivery: null,
    actaDate: null,
    deviationCause: null,
    clientRating: null,
  }
}
