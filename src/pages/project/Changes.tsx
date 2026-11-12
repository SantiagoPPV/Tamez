import { BILLING, CHANNEL, REQUEST_KIND, REQUEST_STATUS, options } from '../../domain/catalogs'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { folio, fmtDate, fmtHours, fmtMoney } from '../../domain/format'
import type { ChangeRequest } from '../../domain/types'
import { DateField, FormGrid, FormSection, NumberField, SelectField, TextArea, TextField } from '../../ui/fields'
import { Alert, Button, DataTable, Drawer, Notice } from '../../ui/kit'
import { names, useDraft, useP, useSaver } from './ctx'

export function ChangesPage() {
  const { data, result } = useP()
  const n = names(data)
  const edit = useDraft<ChangeRequest>()
  const rows = [...data.changes].sort((a, b) => b.seq - a.seq)
  const c = (x: ChangeRequest) => result.changes.get(x.id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-3xl text-sm text-ink2">
          Cada petición del cliente se clasifica el mismo día: <b>defecto</b> (sin costo), <b>ajuste menor</b> (menos de{' '}
          {data.project.params.scopeChangeFromHours} h; sale de la bolsa) o <b>cambio de alcance</b> (requiere aprobación escrita de quien decide y paga).
        </p>
        <Button
          variant="primary"
          onClick={() =>
            edit.setDraft({
              id: localId('chg'),
              seq: 0,
              date: todayInMexico(),
              channel: null,
              requestedById: null,
              description: '',
              kind: null,
              hours: null,
              amount: null,
              segmentId: null,
              businessDaysMoved: null,
              billing: null,
              status: 'in_review',
              decidedById: null,
              responseDate: null,
              recordedIn: '',
              baselineNote: '',
            })
          }
        >
          Nueva solicitud
        </Button>
      </div>
      <DataTable
        rows={rows}
        rowKey={(x) => x.id}
        onRowClick={(x) => edit.setDraft(structuredClone(x))}
        empty="Sin solicitudes del cliente."
        columns={[
          { label: 'Folio', render: (x) => <span className="num font-semibold">{folio.change(x.seq)}</span> },
          { label: 'Fecha', className: 'num whitespace-nowrap', render: (x) => fmtDate(x.date) },
          {
            label: 'Qué pide',
            render: (x) => (
              <div className="min-w-[16rem]">
                <div>{x.description}</div>
                <div className="text-xs text-muted">
                  {n.contact(x.requestedById)}
                  {x.channel && ` · ${CHANNEL[x.channel]}`}
                  {x.segmentId && ` · ${n.segment(x.segmentId)}`}
                </div>
                <Alert>{c(x)?.alert}</Alert>
              </div>
            ),
          },
          { label: 'Tipo', className: 'whitespace-nowrap', render: (x) => (x.kind ? REQUEST_KIND[x.kind] : '') },
          { label: 'Horas', className: 'num text-right', headClassName: 'text-right', render: (x) => fmtHours(x.hours) },
          { label: 'Reales', className: 'num text-right', headClassName: 'text-right', render: (x) => fmtHours(c(x)?.realHours ?? null) },
          { label: 'Monto', className: 'num text-right', headClassName: 'text-right', render: (x) => (x.amount ? fmtMoney(x.amount) : '') },
          { label: 'Se cobra', className: 'text-xs', render: (x) => (x.billing ? BILLING[x.billing] : '') },
          { label: 'Estado', className: 'whitespace-nowrap', render: (x) => (x.status ? REQUEST_STATUS[x.status] : '') },
        ]}
        card={(x) => (
          <div>
            <div className="flex justify-between gap-2 text-xs font-bold text-accent">
              <span className="num">
                {folio.change(x.seq)} · {fmtDate(x.date)}
              </span>
              <span>{x.status ? REQUEST_STATUS[x.status] : ''}</span>
            </div>
            <div className="mt-0.5 text-sm">{x.description}</div>
            <div className="num text-xs text-muted">
              {x.kind ? REQUEST_KIND[x.kind] : ''} · {fmtHours(x.hours)} h{x.amount ? ` · ${fmtMoney(x.amount)}` : ''}
            </div>
            <Alert>{c(x)?.alert}</Alert>
          </div>
        )}
      />
      {edit.draft && <ChangeForm draft={edit.draft} set={edit.set} close={() => edit.setDraft(null)} />}
    </div>
  )
}

function ChangeForm({ draft, set, close }: { draft: ChangeRequest; set: <K extends keyof ChangeRequest>(k: K, v: ChangeRequest[K]) => void; close: () => void }) {
  const { data, result, save } = useP()
  const n = names(data)
  const saver = useSaver()
  const isNew = !data.changes.some((x) => x.id === draft.id)
  const c = result.changes.get(draft.id)
  const p = data.project.params
  const isScope = draft.kind === 'scope_change'
  const warnings: string[] = []
  if (draft.kind === 'minor_adjustment' && (draft.hours ?? 0) >= p.scopeChangeFromHours)
    warnings.push(`De ${p.scopeChangeFromHours} h o más es cambio de alcance (D05).`)
  if (!isScope && (draft.amount ?? 0) > 0) warnings.push('En defecto y ajuste menor el monto va en cero.')
  if (!isScope && draft.status && draft.status !== 'in_review' && draft.status !== 'done')
    warnings.push('Un defecto o un ajuste menor pasa de «En revisión» a «Terminada».')

  async function submit() {
    if (!draft.description.trim() || !draft.kind) return saver.setError('Falta qué pide y su tipo.')
    if (isScope && (draft.status === 'approved' || draft.status === 'rejected') && !draft.decidedById)
      return saver.setError('Falta quién aprobó o rechazó.')
    const ok = await saver.run(() => save('changes', draft))
    if (ok) close()
  }

  return (
    <Drawer
      open
      onClose={close}
      title={isNew ? 'Nueva solicitud del cliente' : `${folio.change(draft.seq)} · solicitud`}
      subtitle="Se captura el mismo día en que llega"
      footer={
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => void submit()} disabled={saver.busy}>
            Guardar
          </Button>
          <Button onClick={close}>Cancelar</Button>
        </div>
      }
    >
      {saver.error && (
        <div className="mb-4">
          <Notice tone="error">{saver.error}</Notice>
        </div>
      )}
      {(warnings.length > 0 || c?.alert) && (
        <div className="mb-4">
          <Notice tone="warn">{warnings.length ? warnings.join(' ') : c?.alert}</Notice>
        </div>
      )}
      <FormSection title="Qué pide">
        <FormGrid>
          <DateField label="Fecha en que llegó" value={draft.date} onChange={(v) => v && set('date', v)} />
          <SelectField label="Canal" value={draft.channel} onChange={(v) => set('channel', v)} options={options(CHANNEL)} />
          <SelectField className="sm:col-span-2" label="Quién lo pidió" value={draft.requestedById} onChange={(v) => set('requestedById', v)} options={n.contactOptions} />
          <TextArea className="sm:col-span-2" label="Qué pide" help="Con sus palabras." value={draft.description} onChange={(v) => set('description', v)} />
          <SelectField label="Tipo" value={draft.kind} onChange={(v) => set('kind', v)} options={options(REQUEST_KIND)} />
          <SelectField label="Hito" value={draft.segmentId} onChange={(v) => set('segmentId', v)} options={n.segmentOptions} />
          <NumberField label="Horas estimadas" help={draft.kind === 'minor_adjustment' ? 'Salen de la bolsa.' : undefined} value={draft.hours} onChange={(v) => set('hours', v)} suffix="h" />
          <NumberField label="Monto sin IVA" value={draft.amount} onChange={(v) => set('amount', v)} />
          <NumberField label="Días hábiles que mueve" value={draft.businessDaysMoved} onChange={(v) => set('businessDaysMoved', v == null ? null : Math.round(v))} />
          <SelectField label="Se cobra" value={draft.billing} onChange={(v) => set('billing', v)} options={options(BILLING)} />
        </FormGrid>
      </FormSection>
      <FormSection title="Respuesta">
        <FormGrid>
          <SelectField label="Estado" value={draft.status} onChange={(v) => set('status', v)} options={options(REQUEST_STATUS)} />
          <SelectField label="Aprobó o rechazó" value={draft.decidedById} onChange={(v) => set('decidedById', v)} options={n.contactOptions} />
          <DateField label="Fecha de respuesta" help="Esperada; después, la real." value={draft.responseDate} onChange={(v) => set('responseDate', v)} />
          <TextField label="Dónde consta" value={draft.recordedIn} onChange={(v) => set('recordedIn', v)} />
          <TextField className="sm:col-span-2" label="Línea base y aviso" help="Versión D03/D11 y reporte en que se avisó." value={draft.baselineNote} onChange={(v) => set('baselineNote', v)} />
        </FormGrid>
      </FormSection>
      {c && !isNew && (
        <p className="num text-xs text-muted">
          Horas reales {fmtHours(c.realHours)} · no cobradas {fmtHours(c.unbilledHours)} · a la bolsa {fmtHours(c.poolHours)} · monto aprobado{' '}
          {fmtMoney(c.approvedAmount)} · en el desglose {fmtHours(c.hoursInWbs)} h · por pasar al desglose {fmtHours(c.hoursToMove)} h
        </p>
      )}
    </Drawer>
  )
}
