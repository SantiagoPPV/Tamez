import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { folio, fmtDate } from '../../domain/format'
import type { Decision } from '../../domain/types'
import { DateField, FormGrid, TextArea, TextField } from '../../ui/fields'
import { Button, DataTable, Drawer, Notice } from '../../ui/kit'
import { useDraft, useP, useSaver } from './ctx'

export function DecisionsPage() {
  const { data } = useP()
  const edit = useDraft<Decision>()
  const rows = [...data.decisions].sort((a, b) => b.seq - a.seq)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-3xl text-sm text-ink2">
          Qué se decidió, quién, por qué y qué se descartó. También cada subida o bajada de escalón en los sombreros.
        </p>
        <Button
          variant="primary"
          onClick={() =>
            edit.setDraft({ id: localId('dec'), seq: 0, date: todayInMexico(), decision: '', decidedBy: '', why: '', discarded: '', recordedIn: '' })
          }
        >
          Nueva decisión
        </Button>
      </div>
      <DataTable
        rows={rows}
        rowKey={(x) => x.id}
        onRowClick={(x) => edit.setDraft(structuredClone(x))}
        empty="Sin decisiones registradas."
        columns={[
          { label: 'Folio', render: (x) => <span className="num font-semibold">{folio.decision(x.seq)}</span> },
          { label: 'Fecha', className: 'num whitespace-nowrap', render: (x) => fmtDate(x.date) },
          {
            label: 'Decisión',
            render: (x) => (
              <div className="min-w-[18rem]">
                <div className="font-semibold">{x.decision}</div>
                <div className="text-xs text-muted">Por qué: {x.why}</div>
                {x.discarded && <div className="text-xs text-muted">Se descartó: {x.discarded}</div>}
              </div>
            ),
          },
          { label: 'Quién decidió', className: 'text-xs', render: (x) => x.decidedBy },
          { label: 'Dónde consta', className: 'text-xs', render: (x) => x.recordedIn },
        ]}
        card={(x) => (
          <div>
            <div className="num text-xs font-bold text-accent">
              {folio.decision(x.seq)} · {fmtDate(x.date)}
            </div>
            <div className="text-sm font-semibold">{x.decision}</div>
            <div className="text-xs text-muted">{x.decidedBy}</div>
          </div>
        )}
      />
      {edit.draft && <DecisionForm draft={edit.draft} set={edit.set} close={() => edit.setDraft(null)} />}
    </div>
  )
}

function DecisionForm({ draft, set, close }: { draft: Decision; set: <K extends keyof Decision>(k: K, v: Decision[K]) => void; close: () => void }) {
  const { data, save } = useP()
  const saver = useSaver()
  const isNew = !data.decisions.some((x) => x.id === draft.id)
  async function submit() {
    if (!draft.decision.trim()) return saver.setError('Falta la decisión.')
    const ok = await saver.run(() => save('decisions', draft))
    if (ok) close()
  }
  return (
    <Drawer
      open
      onClose={close}
      title={isNew ? 'Nueva decisión' : folio.decision(draft.seq)}
      subtitle="Se captura el día en que se toma"
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
      <FormGrid>
        <DateField label="Fecha" value={draft.date} onChange={(v) => v && set('date', v)} />
        <TextField label="Quién decidió" help="Nombre y papel." value={draft.decidedBy} onChange={(v) => set('decidedBy', v)} />
        <TextArea className="sm:col-span-2" label="Decisión" help="En una frase." value={draft.decision} onChange={(v) => set('decision', v)} />
        <TextArea className="sm:col-span-2" label="Por qué" value={draft.why} onChange={(v) => set('why', v)} />
        <TextArea className="sm:col-span-2" label="Qué se descartó" value={draft.discarded} onChange={(v) => set('discarded', v)} />
        <TextField className="sm:col-span-2" label="Dónde consta" help="Correo, minuta o mensaje." value={draft.recordedIn} onChange={(v) => set('recordedIn', v)} />
      </FormGrid>
    </Drawer>
  )
}
