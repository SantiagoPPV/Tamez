import { useState } from 'react'
import { notify } from '../../app/lifecycle'
import { useCan, useRepo, useSession } from '../../app/session'
import { emptyValidation } from '../../domain/crm'
import { todayInMexico } from '../../domain/dates'
import { fmtDate } from '../../domain/format'
import type { Proposal, Prospect } from '../../domain/types'
import { TextArea } from '../../ui/fields'
import { Button, Card, Notice } from '../../ui/kit'
import { useSaver } from '../project/ctx'

export const staffName = (session: ReturnType<typeof useSession>['session']) => (session.status === 'ready' ? session.name || session.email || 'Dirección general' : 'Dirección general')

/** Ninguna propuesta sale sin la validación de dirección general (un administrador). */
export function ValidationCard({ proposal, prospect, save }: { proposal: Proposal; prospect: Prospect; save: (p: Proposal) => Promise<unknown> }) {
  const v = { ...emptyValidation(), ...(proposal.validation ?? {}) }
  const can = useCan()
  const repo = useRepo()
  const { session } = useSession()
  const saver = useSaver()
  const [changes, setChanges] = useState('')
  const [asking, setAsking] = useState(false)
  const set = (validation: Proposal['validation']) => saver.run(() => save({ ...proposal, validation }))
  return (
    <Card className="space-y-3 p-4">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Validación de dirección general</h3>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {v.approvedOn ? (
        <p className="text-sm font-semibold text-accent-2">
          Validada por {v.approvedBy || 'dirección general'} el {fmtDate(v.approvedOn)}. Ya se puede presentar.
        </p>
      ) : v.requestedOn ? (
        <p className="text-sm text-ambar">Por validar desde el {fmtDate(v.requestedOn)}.</p>
      ) : v.changesRequested ? (
        <Notice tone="warn">Dirección general pidió cambios: {v.changesRequested}</Notice>
      ) : (
        <p className="text-sm text-ink2">Antes de presentarla, dirección general revisa objetivo, alcance, pagos y cronograma.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {!v.approvedOn && !v.requestedOn && (
          <Button
            variant="primary"
            disabled={saver.busy}
            onClick={() =>
              void set({ ...v, requestedOn: todayInMexico(), changesRequested: '' }).then(async (ok) => {
                if (ok)
                  await notify(repo, {
                    kind: 'validation',
                    title: `Propuesta por validar: ${prospect.company}`,
                    body: `${proposal.name} · ${proposal.variant} v${proposal.version}`,
                    link: `/crm/${prospect.id}/propuesta/${proposal.id}`,
                    projectId: null,
                    prospectId: prospect.id,
                  })
              })
            }
          >
            Pedir validación
          </Button>
        )}
        {can.approveGates && !v.approvedOn && (
          <Button variant="primary" disabled={saver.busy} onClick={() => void set({ ...v, approvedOn: todayInMexico(), approvedBy: staffName(session), changesRequested: '' })}>
            Validar
          </Button>
        )}
        {can.approveGates && !v.approvedOn && v.requestedOn && !asking && (
          <Button variant="ghost" onClick={() => setAsking(true)}>
            Pedir cambios
          </Button>
        )}
      </div>
      {asking && (
        <div className="space-y-2">
          <TextArea label="Qué hay que cambiar" rows={2} value={changes} onChange={setChanges} />
          <div className="flex gap-2">
            <Button size="sm" disabled={!changes.trim()} onClick={() => void set({ ...v, requestedOn: null, changesRequested: changes.trim() }).then((ok) => ok && setAsking(false))}>
              Mandar los cambios
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {!can.approveGates && !v.approvedOn && v.requestedOn && <p className="text-xs text-muted">La valida un administrador (Santiago).</p>}
    </Card>
  )
}
