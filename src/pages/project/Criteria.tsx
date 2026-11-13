import { useState } from 'react'
import { CRITERION_CLASS, CRITERION_RESULT, options } from '../../domain/catalogs'
import { localId } from '../../domain/factory'
import type { AcceptanceCriterion, Milestone } from '../../domain/types'
import { Button, Notice } from '../../ui/kit'
import { useP, useSaver } from './ctx'
import { useAsk } from '../../ui/feedback'

/** Criterios de aceptación del hito: se escriben en la D04 y se prueban con el guion de la D07. */
export function CriteriaSection({ milestone }: { milestone: Milestone }) {
  const { data } = useP()
  const list = data.criteria.filter((c) => c.milestoneId === milestone.id).sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }))
  const [adding, setAdding] = useState<AcceptanceCriterion | null>(null)
  const n = milestone.key.replace(/^H/i, '')
  const next = () => {
    const nums = list.map((c) => Number(c.code.split('-').pop())).filter(Number.isFinite)
    const deliverable = list[list.length - 1]?.deliverable || `${n}.1`
    const sameDel = list.filter((c) => c.deliverable === deliverable).length
    return {
      id: localId('ca'),
      milestoneId: milestone.id,
      code: `CA-${deliverable}-${String(sameDel + 1).padStart(2, '0')}`,
      deliverable,
      action: '',
      expected: '',
      result: null,
      obtained: '',
      evidence: '',
      classification: null,
      note: nums.length ? '' : '',
    } satisfies AcceptanceCriterion
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Cada criterio se responde con sí o no: qué hace el usuario y qué resultado espera. Solo detiene el acta un defecto que impide cumplir un criterio.
      </p>
      {list.map((c) => (
        <CriterionRow key={c.id} c={c} />
      ))}
      {adding ? (
        <CriterionRow c={adding} isNew onDone={() => setAdding(null)} />
      ) : (
        <Button size="sm" onClick={() => setAdding(next())}>
          Agregar criterio
        </Button>
      )}
    </div>
  )
}

function CriterionRow({ c, isNew, onDone }: { c: AcceptanceCriterion; isNew?: boolean; onDone?: () => void }) {
  const { save, remove } = useP()
  const ask = useAsk()
  const [d, setD] = useState(c)
  const saver = useSaver()
  const dirty = JSON.stringify(d) !== JSON.stringify(c)
  const set = <K extends keyof AcceptanceCriterion>(k: K, v: AcceptanceCriterion[K]) => setD((x) => ({ ...x, [k]: v }))
  const input = 'w-full rounded-md border border-rule px-2 py-1 text-sm focus:border-accent focus:outline-none'
  return (
    <div className="rounded-lg border border-rule p-3">
      <div className="mb-2 grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
        <input className={`${input} num font-semibold`} value={d.code} onChange={(e) => set('code', e.target.value)} aria-label="Clave del criterio" />
        <input className={input} value={d.deliverable} onChange={(e) => set('deliverable', e.target.value)} aria-label="Entregable" placeholder="Entregable" />
      </div>
      <textarea className={`${input} mb-2`} rows={2} value={d.action} onChange={(e) => set('action', e.target.value)} placeholder="Qué hace el usuario" aria-label="Acción" />
      <textarea className={`${input} mb-2`} rows={2} value={d.expected} onChange={(e) => set('expected', e.target.value)} placeholder="Resultado esperado" aria-label="Resultado esperado" />
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={d.result ?? ''} onChange={(e) => set('result', (e.target.value || null) as AcceptanceCriterion['result'])} aria-label="Resultado de la prueba">
          <option value="">Sin probar</option>
          {options(CRITERION_RESULT).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select className={input} value={d.classification ?? ''} onChange={(e) => set('classification', (e.target.value || null) as AcceptanceCriterion['classification'])} aria-label="Clasificación">
          <option value="">Sin clasificar</option>
          {options(CRITERION_CLASS).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {d.result === 'fail' && <input className={`${input} mt-2`} value={d.obtained} onChange={(e) => set('obtained', e.target.value)} placeholder="Qué se obtuvo" />}
      {saver.error && (
        <div className="mt-2">
          <Notice tone="error">{saver.error}</Notice>
        </div>
      )}
      <div className="mt-2 flex gap-2">
        {(dirty || isNew) && (
          <Button size="sm" variant="primary" disabled={!d.code.trim() || saver.busy} onClick={() => void saver.run(() => save('criteria', d)).then((ok) => ok && onDone?.())}>
            Guardar
          </Button>
        )}
        {isNew ? (
          <Button size="sm" onClick={onDone}>
            Cancelar
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => ask(`¿Borrar el criterio ${c.code}?`, () => saver.run(() => remove('criteria', c.id)))}>
            Borrar
          </Button>
        )}
      </div>
    </div>
  )
}
