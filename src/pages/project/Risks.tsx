import { DEPENDS_ON, RISK_CLASS, RISK_STATUS, SEVERITY, options } from '../../domain/catalogs'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { folio, fmtDate, fmtHours } from '../../domain/format'
import type { Risk } from '../../domain/types'
import { DateField, FormGrid, FormSection, SelectField, TextArea } from '../../ui/fields'
import { Alert, Button, cx, DataTable, Drawer, Notice } from '../../ui/kit'
import { names, useDraft, useP, useSaver } from './ctx'

const SEV_STYLE = { high: 'bg-rojo-soft text-rojo', medium: 'bg-ambar-soft text-ambar', low: 'bg-soft text-muted' }

export function RisksPage() {
  const { data, result } = useP()
  const n = names(data)
  const edit = useDraft<Risk>()
  const rows = [...data.risks].sort((a, b) => (a.status === 'closed') === (b.status === 'closed') ? b.seq - a.seq : a.status === 'closed' ? 1 : -1)
  const c = (x: Risk) => result.risks.get(x.id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-3xl text-sm text-ink2">
          Lo que puede salir mal (riesgo) o ya salió mal (incidente). Se revisa cada viernes. El folio R-xx es el que llevan en la bitácora las horas que bajan la
          reserva.
        </p>
        <Button
          variant="primary"
          onClick={() =>
            edit.setDraft({
              id: localId('risk'),
              seq: 0,
              date: todayInMexico(),
              riskClass: 'risk',
              description: '',
              severity: null,
              dependsOn: null,
              commitmentDate: null,
              ownerId: null,
              action: '',
              status: 'open',
              lastReview: todayInMexico(),
            })
          }
        >
          Nuevo riesgo o incidente
        </Button>
      </div>
      <DataTable
        rows={rows}
        rowKey={(x) => x.id}
        onRowClick={(x) => edit.setDraft(structuredClone(x))}
        empty="Sin riesgos ni incidentes."
        columns={[
          { label: 'Folio', render: (x) => <span className="num font-semibold">{folio.risk(x.seq)}</span> },
          { label: 'Clase', render: (x) => (x.riskClass ? RISK_CLASS[x.riskClass] : '') },
          {
            label: 'Descripción y acción',
            render: (x) => (
              <div className="min-w-[18rem]">
                <div>{x.description}</div>
                <div className="text-xs text-muted">{x.action}</div>
                <Alert>{c(x)?.alert}</Alert>
              </div>
            ),
          },
          {
            label: 'Gravedad',
            render: (x) =>
              x.severity ? <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', SEV_STYLE[x.severity])}>{SEVERITY[x.severity]}</span> : null,
          },
          { label: 'Depende de', render: (x) => (x.dependsOn ? DEPENDS_ON[x.dependsOn] : '') },
          { label: 'Compromiso', className: 'num whitespace-nowrap', render: (x) => fmtDate(x.commitmentDate) },
          { label: 'Atiende', className: 'whitespace-nowrap', render: (x) => n.member(x.ownerId) },
          { label: 'Estado', render: (x) => (x.status ? RISK_STATUS[x.status] : '') },
          { label: 'Reserva', className: 'num text-right', headClassName: 'text-right', render: (x) => fmtHours(c(x)?.reserveHours ?? 0) },
        ]}
        card={(x) => (
          <div>
            <div className="flex justify-between gap-2 text-xs font-bold text-accent">
              <span className="num">
                {folio.risk(x.seq)} · {x.riskClass ? RISK_CLASS[x.riskClass] : ''}
              </span>
              <span>{x.status ? RISK_STATUS[x.status] : ''}</span>
            </div>
            <div className="mt-0.5 text-sm">{x.description}</div>
            <div className="num text-xs text-muted">
              {x.severity ? SEVERITY[x.severity] : ''} · compromiso {fmtDate(x.commitmentDate)} · {n.member(x.ownerId)}
            </div>
            <Alert>{c(x)?.alert}</Alert>
          </div>
        )}
      />
      {edit.draft && <RiskForm draft={edit.draft} set={edit.set} close={() => edit.setDraft(null)} />}
    </div>
  )
}

function RiskForm({ draft, set, close }: { draft: Risk; set: <K extends keyof Risk>(k: K, v: Risk[K]) => void; close: () => void }) {
  const { data, save } = useP()
  const n = names(data)
  const saver = useSaver()
  const isNew = !data.risks.some((x) => x.id === draft.id)
  async function submit() {
    if (!draft.description.trim()) return saver.setError('Falta la descripción.')
    const ok = await saver.run(() => save('risks', draft))
    if (ok) close()
  }
  return (
    <Drawer
      open
      onClose={close}
      title={isNew ? 'Nuevo riesgo o incidente' : `${folio.risk(draft.seq)} · ${draft.riskClass ? RISK_CLASS[draft.riskClass] : ''}`}
      subtitle="Alta: puede mover un hito 5 días hábiles o bajar el margen 5 puntos. Media: mueve fecha o costo sin llegar a eso. Baja: no mueve nada."
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
      <FormSection title="Qué puede salir o salió mal">
        <FormGrid>
          <DateField label="Fecha en que se detectó" value={draft.date} onChange={(v) => v && set('date', v)} />
          <SelectField label="Clase" value={draft.riskClass} onChange={(v) => set('riskClass', v)} options={options(RISK_CLASS)} />
          <TextArea className="sm:col-span-2" label="Descripción" help="Qué puede salir o salió mal y a qué afecta." value={draft.description} onChange={(v) => set('description', v)} />
          <SelectField label="Gravedad" value={draft.severity} onChange={(v) => set('severity', v)} options={options(SEVERITY)} />
          <SelectField label="Depende de" value={draft.dependsOn} onChange={(v) => set('dependsOn', v)} options={options(DEPENDS_ON)} />
        </FormGrid>
      </FormSection>
      <FormSection title="Qué se hará">
        <FormGrid>
          <SelectField label="Quién lo atiende" help="Una sola persona." value={draft.ownerId} onChange={(v) => set('ownerId', v)} options={n.memberOptions} />
          <DateField label="Fecha compromiso" value={draft.commitmentDate} onChange={(v) => set('commitmentDate', v)} />
          <TextArea className="sm:col-span-2" label="Acción" help="Acción concreta, con fecha." value={draft.action} onChange={(v) => set('action', v)} />
          <SelectField label="Estado" value={draft.status} onChange={(v) => set('status', v)} options={options(RISK_STATUS)} />
          <DateField label="Última revisión" value={draft.lastReview} onChange={(v) => set('lastReview', v)} />
        </FormGrid>
      </FormSection>
    </Drawer>
  )
}
