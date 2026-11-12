import { useId } from 'react'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate } from '../../domain/format'
import type { ClientPending } from '../../domain/types'
import { DateField, FormGrid, SelectField, TextArea, TextField } from '../../ui/fields'
import { Button, cx, DataTable, Drawer, Notice } from '../../ui/kit'
import { names, useDraft, useP, useSaver } from './ctx'

export function PendingsPage() {
  const { data, result } = useP()
  const n = names(data)
  const edit = useDraft<ClientPending>()
  const c = (x: ClientPending) => result.pendings.get(x.id)
  const rows = [...data.pendings].sort((a, b) => {
    const oa = c(a)?.overdueAtCutoff ?? 0
    const ob = c(b)?.overdueAtCutoff ?? 0
    if (oa !== ob) return ob - oa
    return (b.requestedOn ?? '').localeCompare(a.requestedOn ?? '')
  })
  const state = (x: ClientPending) => {
    const pc = c(x)
    if (pc?.overdueAtCutoff === 1) return { label: `Vencido ${pc.overdueDays} d. háb.`, cls: 'bg-rojo-soft text-rojo' }
    if (x.receivedOn && x.receivedOn <= result.cutoff) return { label: pc?.overdueDays ? `Llegó ${pc.overdueDays} d. tarde` : 'Llegó', cls: 'bg-accent-soft text-accent-2' }
    return { label: 'En espera', cls: 'bg-ambar-soft text-ambar' }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-3xl text-sm text-ink2">
          Lo que debe entregar el cliente. El día del vencimiento se le escribe qué se bloquea; cada día hábil de espera recorre un día hábil la fecha prevista
          de los hitos siguientes, sin mover la línea base.
        </p>
        <Button
          variant="primary"
          onClick={() =>
            edit.setDraft({
              id: localId('pend'),
              position: Math.max(0, ...data.pendings.map((x) => x.position)) + 1,
              description: '',
              contactId: null,
              requestedOn: todayInMexico(),
              dueOn: null,
              receivedOn: null,
              blocksKey: null,
            })
          }
        >
          Nuevo pendiente
        </Button>
      </div>
      <DataTable
        rows={rows}
        rowKey={(x) => x.id}
        onRowClick={(x) => edit.setDraft(structuredClone(x))}
        empty="Sin pendientes del cliente."
        columns={[
          { label: 'Qué se necesita', render: (x) => <div className="min-w-[16rem]">{x.description}</div> },
          { label: 'Quién del cliente', className: 'whitespace-nowrap', render: (x) => n.contact(x.contactId) },
          { label: 'Pedido', className: 'num whitespace-nowrap', render: (x) => fmtDate(x.requestedOn) },
          { label: 'Compromiso', className: 'num whitespace-nowrap', render: (x) => fmtDate(x.dueOn) },
          { label: 'Llegó', className: 'num whitespace-nowrap', render: (x) => fmtDate(x.receivedOn) },
          {
            label: 'Bloquea',
            className: 'num text-xs',
            render: (x) => (
              <>
                {x.blocksKey}
                <div className="text-muted">{c(x)?.keyMissing ? 'Clave no existe' : n.segment(c(x)?.blockingSegmentId)}</div>
              </>
            ),
          },
          {
            label: 'Estado',
            render: (x) => <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', state(x).cls)}>{state(x).label}</span>,
          },
        ]}
        card={(x) => (
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold">{x.description}</span>
              <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', state(x).cls)}>{state(x).label}</span>
            </div>
            <div className="num text-xs text-muted">
              {n.contact(x.contactId)} · compromiso {fmtDate(x.dueOn)} {x.blocksKey && `· bloquea ${x.blocksKey}`}
            </div>
          </div>
        )}
      />
      {edit.draft && <PendingForm draft={edit.draft} set={edit.set} close={() => edit.setDraft(null)} />}
    </div>
  )
}

function PendingForm({ draft, set, close }: { draft: ClientPending; set: <K extends keyof ClientPending>(k: K, v: ClientPending[K]) => void; close: () => void }) {
  const { data, save, remove } = useP()
  const n = names(data)
  const saver = useSaver()
  const listId = useId()
  const isNew = !data.pendings.some((x) => x.id === draft.id)
  async function submit() {
    if (!draft.description.trim()) return saver.setError('Falta qué se necesita.')
    const ok = await saver.run(() => save('pendings', draft))
    if (ok) close()
  }
  return (
    <Drawer
      open
      onClose={close}
      title={isNew ? 'Nuevo pendiente del cliente' : 'Pendiente del cliente'}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void submit()} disabled={saver.busy}>
            Guardar
          </Button>
          <Button onClick={close}>Cancelar</Button>
          <div className="flex-1" />
          {!isNew && (
            <Button variant="danger" onClick={() => confirm('¿Borrar este pendiente?') && void saver.run(() => remove('pendings', draft.id)).then((ok) => ok && close())}>
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
      <FormGrid>
        <TextArea className="sm:col-span-2" label="Qué se necesita" value={draft.description} onChange={(v) => set('description', v)} rows={2} />
        <SelectField className="sm:col-span-2" label="Quién del cliente" value={draft.contactId} onChange={(v) => set('contactId', v)} options={n.contactOptions} />
        <DateField label="Fecha del pedido" value={draft.requestedOn} onChange={(v) => set('requestedOn', v)} />
        <DateField label="Fecha compromiso" value={draft.dueOn} onChange={(v) => set('dueOn', v)} />
        <DateField label="Fecha en que llegó" value={draft.receivedOn} onChange={(v) => set('receivedOn', v)} />
        <div>
          <TextField label="Renglón que bloquea" help="Clave del desglose." value={draft.blocksKey ?? ''} onChange={(v) => set('blocksKey', v.trim() || null)} list={listId} />
          <datalist id={listId}>
            {data.wbs.map((w) => (
              <option key={w.id} value={w.key}>
                {w.name}
              </option>
            ))}
          </datalist>
        </div>
      </FormGrid>
    </Drawer>
  )
}
