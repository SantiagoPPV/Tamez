import { useId, useMemo, useState } from 'react'
import { useSession } from '../../app/session'
import { HOUR_CLASS, HOUR_MARK, options } from '../../domain/catalogs'
import { todayInMexico } from '../../domain/dates'
import { newWorkLog } from '../../domain/factory'
import { folio, fmtDate, fmtHours, fmtMoney } from '../../domain/format'
import type { WorkLog } from '../../domain/types'
import { Check, DateField, FormGrid, FormSection, NumberField, SelectField, TextArea, TextField } from '../../ui/fields'
import { Alert, Button, DataTable, Drawer, Notice } from '../../ui/kit'
import { names, useDraft, useP, useSaver } from './ctx'

export function WorkLogPage() {
  const { data, result } = useP()
  const { session } = useSession()
  const n = names(data)
  const edit = useDraft<WorkLog>()
  const [person, setPerson] = useState<string | null>(null)
  const [onlyAlerts, setOnlyAlerts] = useState(false)
  const [q, setQ] = useState('')
  const activityName = useMemo(() => new Map(data.wbs.map((w) => [w.key, w.name])), [data.wbs])

  const me = session.status === 'ready' ? data.members.find((m) => m.userId && m.userId === session.userId) : undefined
  const rows = useMemo(() => {
    const text = q.trim().toLowerCase()
    return [...data.workLogs]
      .sort((a, b) => (a.date === b.date ? b.seq - a.seq : a.date < b.date ? 1 : -1))
      .filter(
        (l) =>
          (!person || l.personId === person) &&
          (!onlyAlerts || result.workLogs.get(l.id)?.alert) &&
          (!text || `${l.activityKey} ${l.description} ${l.relatedFolio ?? ''}`.toLowerCase().includes(text)),
      )
  }, [data.workLogs, person, onlyAlerts, q, result.workLogs])

  const totals = useMemo(() => {
    const today = todayInMexico()
    const byPerson = data.members.map((m) => ({
      name: m.name,
      today: data.workLogs.filter((l) => l.personId === m.id && l.date === today).reduce((s, l) => s + (l.hours ?? 0), 0),
    }))
    return byPerson
  }, [data.workLogs, data.members])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-auto">
          <Button
            variant="primary"
            className="h-12 w-full text-base sm:h-10 sm:w-auto sm:text-sm"
            onClick={() =>
              edit.setDraft(newWorkLog({ seq: 0, date: todayInMexico(), personId: me?.id ?? data.members[0]?.id ?? null, hourClass: 'planned' }))
            }
          >
            Registrar horas
          </Button>
        </div>
        <SelectField className="w-[calc(50%-0.375rem)] sm:w-44" label="Persona" value={person} onChange={setPerson} options={n.memberOptions} placeholder="Todas" />
        <TextField className="w-[calc(50%-0.375rem)] sm:w-56" label="Buscar" value={q} onChange={setQ} placeholder="Clave, texto o folio" />
        <div className="pb-2.5">
          <Check checked={onlyAlerts} onChange={setOnlyAlerts} label="Solo con alerta" />
        </div>
        <div className="flex-1" />
        <div className="num text-xs text-muted">
          Hoy: {totals.map((t) => `${t.name} ${fmtHours(t.today)} h`).join(' · ')}
        </div>
      </div>

      <p className="text-xs text-muted">
        Se anota el mismo día, un renglón por persona y actividad. Si no está en la bitácora, no pasó. Ningún renglón se borra: un error se corrige con un
        renglón nuevo que cita el folio anterior.
      </p>

      <DataTable
        rows={rows}
        rowKey={(l) => l.id}
        onRowClick={(l) => edit.setDraft(structuredClone(l))}
        empty="Sin renglones todavía."
        columns={[
          { label: 'Folio', render: (l) => <span className="num font-semibold whitespace-nowrap">{folio.workLog(l.seq)}</span> },
          { label: 'Fecha', className: 'num whitespace-nowrap', render: (l) => fmtDate(l.date) },
          { label: 'Persona', className: 'whitespace-nowrap', render: (l) => n.member(l.personId) },
          {
            label: 'Actividad y qué se hizo',
            render: (l) => (
              <div className="min-w-[16rem]">
                <div className="text-xs text-muted">
                  <span className="num font-semibold text-ink2">{l.activityKey}</span> {activityName.get(l.activityKey)}
                </div>
                <div>{l.description}</div>
                {l.blocker && <div className="text-xs text-ambar">Bloqueo: {l.blocker}</div>}
                <Alert>{result.workLogs.get(l.id)?.alert}</Alert>
              </div>
            ),
          },
          { label: 'Horas', className: 'num text-right font-semibold', headClassName: 'text-right', render: (l) => fmtHours(l.hours) },
          {
            label: 'Clase',
            className: 'whitespace-nowrap text-xs',
            render: (l) => (
              <>
                {l.hourClass ? HOUR_CLASS[l.hourClass] : ''}
                {l.mark && <div className="text-muted">{HOUR_MARK[l.mark]}</div>}
              </>
            ),
          },
          { label: 'Folio rel.', className: 'num text-xs', render: (l) => l.relatedFolio },
          { label: 'Gasto', className: 'num text-right text-xs', headClassName: 'text-right', render: (l) => (l.directCost ? fmtMoney(l.directCost) : '') },
          { label: 'Evid.', className: 'text-center', render: (l) => (l.evidence ? '✓' : '') },
        ]}
        card={(l) => (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="num text-xs font-bold text-accent">
                {folio.workLog(l.seq)} · {fmtDate(l.date)} · {n.member(l.personId)}
              </span>
              <span className="num font-bold">{fmtHours(l.hours)} h</span>
            </div>
            <div className="mt-0.5 text-sm">{l.description}</div>
            <div className="num text-xs text-muted">
              {l.activityKey} · {l.hourClass ? HOUR_CLASS[l.hourClass] : ''}
              {l.mark ? ` · ${HOUR_MARK[l.mark]}` : ''}
              {l.relatedFolio ? ` · ${l.relatedFolio}` : ''}
            </div>
            <Alert>{result.workLogs.get(l.id)?.alert}</Alert>
          </div>
        )}
      />

      {edit.draft && <WorkLogForm draft={edit.draft} set={edit.set} close={() => edit.setDraft(null)} activityName={activityName} />}
    </div>
  )
}

function WorkLogForm({
  draft,
  set,
  close,
  activityName,
}: {
  draft: WorkLog
  set: <K extends keyof WorkLog>(k: K, v: WorkLog[K]) => void
  close: () => void
  activityName: Map<string, string>
}) {
  const { data, result, save } = useP()
  const n = names(data)
  const saver = useSaver()
  const listId = useId()
  const isNew = !data.workLogs.some((l) => l.id === draft.id)
  const calc = result.workLogs.get(draft.id)
  const activities = data.wbs.filter((w) => w.rowClass !== 'deliverable').sort((a, b) => a.position - b.position)
  const keyKnown = !draft.activityKey || activityName.has(draft.activityKey)
  const folios = [
    ...data.risks.map((r) => folio.risk(r.seq)),
    ...data.changes.map((c) => folio.change(c.seq)),
  ]
  const needsFolio = draft.hourClass === 'unplanned' || draft.hourClass === 'minor_adjustment' || draft.mark === 'warranty'

  async function submit(again: boolean) {
    const missing = [
      !draft.date && 'fecha',
      !draft.personId && 'persona',
      !draft.activityKey && 'clave de actividad',
      draft.hours == null && 'horas',
      !draft.description.trim() && 'qué se hizo',
    ].filter(Boolean)
    if (missing.length) return saver.setError(`Falta: ${missing.join(', ')}.`)
    if (draft.hours! < 0 || draft.hours! > 24) return saver.setError('Las horas van de 0 a 24.')
    if (needsFolio && !draft.relatedFolio)
      return saver.setError('El imprevisto, el ajuste menor y la garantía llevan su folio relacionado (R-xx o C-xx).')
    const ok = await saver.run(() => save('workLogs', { ...draft, description: draft.description.trim(), relatedFolio: draft.relatedFolio?.trim() || null }))
    if (!ok) return
    if (again) {
      set('activityKey', '')
      set('description', '')
      set('hours', null)
      set('evidence', '')
      set('blocker', '')
      set('relatedFolio', null)
      set('directCost', null)
      set('id', crypto.randomUUID())
      set('seq', 0)
    } else close()
  }

  return (
    <Drawer
      open
      onClose={close}
      title={isNew ? 'Registrar horas' : `${folio.workLog(draft.seq)} · ${fmtDate(draft.date)}`}
      subtitle={isNew ? 'Al cierre del día: un renglón por persona y actividad' : 'Corrige solo errores de captura; lo demás va en un renglón nuevo'}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void submit(false)} disabled={saver.busy}>
            Guardar
          </Button>
          {isNew && (
            <Button onClick={() => void submit(true)} disabled={saver.busy}>
              Guardar y otro
            </Button>
          )}
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
        </div>
      }
    >
      {saver.error && (
        <div className="mb-4">
          <Notice tone="error">{saver.error}</Notice>
        </div>
      )}
      {!isNew && calc?.alert && (
        <div className="mb-4">
          <Notice tone="warn">{calc.alert}</Notice>
        </div>
      )}
      <FormSection title="Qué se hizo">
        <FormGrid>
          <DateField label="Fecha" value={draft.date} onChange={(v) => v && set('date', v)} required />
          <SelectField label="Persona" value={draft.personId} onChange={(v) => set('personId', v)} options={n.memberOptions} />
          <div className="sm:col-span-2">
            <TextField
              label="Clave de actividad"
              value={draft.activityKey}
              onChange={(v) => set('activityKey', v.trim())}
              list={listId}
              placeholder="1.3-A02"
              error={keyKnown ? undefined : 'Esa clave no existe en el desglose.'}
              help={activityName.get(draft.activityKey) ?? 'Toda hora lleva clave de actividad del desglose.'}
            />
            <datalist id={listId}>
              {activities.map((w) => (
                <option key={w.id} value={w.key}>
                  {w.name}
                </option>
              ))}
            </datalist>
          </div>
          <TextArea className="sm:col-span-2" label="Qué se hizo" help="El resultado, en una frase." value={draft.description} onChange={(v) => set('description', v)} rows={2} />
          <NumberField label="Horas" value={draft.hours} onChange={(v) => set('hours', v)} suffix="h" help="Un decimal." />
          <SelectField label="Clase de hora" value={draft.hourClass} onChange={(v) => set('hourClass', v)} options={options(HOUR_CLASS)} allowEmpty={false} />
          <SelectField
            label="Marca"
            help="Formación: observación o revisión total al delegar."
            value={draft.mark}
            onChange={(v) => set('mark', v)}
            options={options(HOUR_MARK)}
            placeholder="Ninguna"
          />
          <SelectField
            label="Folio relacionado"
            help={needsFolio ? 'Obligatorio en esta clase de hora.' : 'R-xx o C-xx, si aplica.'}
            value={draft.relatedFolio}
            onChange={(v) => set('relatedFolio', v)}
            options={folios.map((f) => ({ value: f, label: f }))}
            placeholder="Ninguno"
          />
        </FormGrid>
      </FormSection>
      <FormSection title="Evidencia, gasto y bloqueo">
        <FormGrid>
          <TextField className="sm:col-span-2" label="Evidencia" help="Obligatoria en el renglón que termina la actividad." value={draft.evidence} onChange={(v) => set('evidence', v)} />
          <NumberField label="Gasto directo" help="Pesos pagados a terceros." value={draft.directCost} onChange={(v) => set('directCost', v)} />
          <TextField label="Bloqueo" help="Qué impide avanzar y quién lo resuelve." value={draft.blocker} onChange={(v) => set('blocker', v)} />
        </FormGrid>
      </FormSection>
    </Drawer>
  )
}
