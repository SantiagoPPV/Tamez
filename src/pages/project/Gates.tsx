import { useCan, useSession } from '../../app/session'
import { GATE_DEFS } from '../../domain/catalogs'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate } from '../../domain/format'
import { gateRows, GATE_STATE_LABEL, type GateRow } from '../../domain/gates'
import type { Gate } from '../../domain/types'
import { Check } from '../../ui/fields'
import { Button, Card, cx, Notice } from '../../ui/kit'
import { names, useP, useSaver } from './ctx'

const STATE_STYLE = {
  approved: 'bg-accent text-white',
  requested: 'bg-ambar-soft text-ambar',
  ready: 'bg-accent-soft text-accent-2',
  pending: 'bg-soft text-muted',
}

export function GatesPage() {
  const { data, result } = useP()
  const rows = gateRows(data, result)
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-ink2">
        Cinco puertas: propuesta aceptada, arranque autorizado, línea base firmada, hito aceptado (una por hito) y proyecto cerrado. Las casillas las palomea
        alguien distinto a quien trabajó; la puerta se pide cuando todas cumplen y la aprueba Santiago, que responde en 1 día hábil.
      </p>
      <div className="space-y-3">
        {rows.map((g) => (
          <GateCard key={`${g.gate}-${g.milestone?.id ?? ''}`} g={g} />
        ))}
      </div>
    </div>
  )
}

function GateCard({ g }: { g: GateRow }) {
  const { data, save } = useP()
  const { session } = useSession()
  const can = useCan()
  const n = names(data)
  const saver = useSaver()
  const def = GATE_DEFS[g.gate]
  const record: Gate = g.record ?? {
    id: localId('gate'),
    gate: g.gate,
    milestoneId: g.milestone?.id ?? null,
    checklist: [],
    requestedOn: null,
    approvedById: null,
    approvedOn: null,
    notes: '',
  }
  const approved = Boolean(record.approvedOn)
  const me =
    session.status === 'ready'
      ? (data.members.find((m) => m.userId && m.userId === session.userId) ?? data.members.find((m) => data.hats.some((h) => h.hat === 'sales' && h.holderId === m.id)))
      : undefined
  const put = (patch: Partial<Gate>) => void saver.run(() => save('gates', { ...record, ...patch }))

  return (
    <Card className={cx('p-4', approved && 'border-accent-mid')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-accent">
            Puerta {g.gate} · {def.stage}
          </div>
          <div className="text-base font-bold">
            {g.name}
            {g.milestone && <span className="font-normal text-muted"> · {g.milestone.title}</span>}
          </div>
        </div>
        <span className={cx('rounded-full px-2.5 py-0.5 text-sm font-semibold', STATE_STYLE[g.state])}>
          {GATE_STATE_LABEL[g.state]}
          {record.approvedOn && ` el ${fmtDate(record.approvedOn)}`}
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {def.items.map((item, i) => {
          const hint = g.hints[i]
          return (
            <li key={i}>
              <Check
                checked={record.checklist.includes(String(i))}
                disabled={approved}
                onChange={(v) =>
                  put({ checklist: v ? [...new Set([...record.checklist, String(i)])] : record.checklist.filter((x) => x !== String(i)) })
                }
                label={item}
              />
              {hint && <div className={cx('ml-6.5 pl-0.5 text-xs', hint.ok ? 'text-accent-2' : 'text-ambar')}>{hint.ok ? '✓' : '•'} Según los datos: {hint.text}</div>}
            </li>
          )
        })}
      </ul>
      <div className="mt-3">
        <label className="mb-1 block text-sm font-semibold text-ink2" htmlFor={`notes-${record.id}`}>
          Notas
        </label>
        <textarea
          id={`notes-${record.id}`}
          key={record.notes}
          rows={1}
          disabled={approved}
          defaultValue={record.notes}
          placeholder="Dónde consta cada casilla"
          className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none disabled:bg-soft"
          onBlur={(e) => e.target.value !== record.notes && put({ notes: e.target.value })}
        />
      </div>
      {saver.error && (
        <div className="mt-3">
          <Notice tone="error">{saver.error}</Notice>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!approved && !record.requestedOn && (
          <Button size="sm" disabled={g.checked < g.total || saver.busy} onClick={() => put({ requestedOn: todayInMexico() })}>
            Pedir la puerta a Santiago
          </Button>
        )}
        {!approved && can.approveGates && (
          <Button size="sm" variant="primary" disabled={g.checked < g.total || saver.busy} onClick={() => put({ approvedOn: todayInMexico(), approvedById: me?.id ?? null, requestedOn: record.requestedOn ?? todayInMexico() })}>
            Aprobar
          </Button>
        )}
        {approved && can.approveGates && (
          <Button size="sm" variant="ghost" onClick={() => put({ approvedOn: null, approvedById: null })}>
            Quitar la aprobación
          </Button>
        )}
        {record.requestedOn && !approved && <span className="text-xs text-muted">Pedida el {fmtDate(record.requestedOn)}</span>}
        {approved && <span className="text-xs text-muted">Aprobó {n.member(record.approvedById) || 'Santiago'}</span>}
        {!can.approveGates && !approved && <span className="text-xs text-muted">Solo un administrador aprueba.</span>}
      </div>
      {!approved && <p className="mt-2 text-xs text-muted">Si falta algo: {def.ifMissing}</p>}
    </Card>
  )
}
