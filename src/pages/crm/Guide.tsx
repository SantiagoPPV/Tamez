import { useState } from 'react'
import { useFirm } from '../../app/useGlobal'
import { getGuide, GUIDE_TITLE } from '../../domain/formats'
import type { GuideKey } from '../../domain/types'

/** Texto con «## título» y «- viñeta» a bloques. */
export function GuideText({ text }: { text: string }) {
  const blocks: { kind: 'h' | 'p' | 'ul'; items: string[] }[] = []
  for (const raw of text.split('\n')) {
    const l = raw.trim()
    if (!l) continue
    if (l.startsWith('## ')) blocks.push({ kind: 'h', items: [l.slice(3)] })
    else if (/^[-•]\s+/.test(l)) {
      const last = blocks[blocks.length - 1]
      if (last?.kind === 'ul') last.items.push(l.replace(/^[-•]\s+/, ''))
      else blocks.push({ kind: 'ul', items: [l.replace(/^[-•]\s+/, '')] })
    } else blocks.push({ kind: 'p', items: [l] })
  }
  return (
    <div className="space-y-2 text-sm text-ink2">
      {blocks.map((b, i) =>
        b.kind === 'h' ? (
          <h4 key={i} className="pt-1 text-xs font-bold uppercase tracking-wider text-accent">
            {b.items[0]}
          </h4>
        ) : b.kind === 'ul' ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((x, j) => (
              <li key={j}>{x}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.items[0]}</p>
        ),
      )}
    </div>
  )
}

/** La guía de la etapa, plegable, con el texto del despacho (editable en Despacho). */
export function Guide({ guide }: { guide: GuideKey }) {
  const { firm } = useFirm()
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-accent-mid/50 bg-accent-soft/40">
      <button type="button" className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold text-accent-2" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
        <span>{GUIDE_TITLE[guide]}</span>
        <span aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="border-t border-accent-mid/40 px-4 py-3">
          <GuideText text={getGuide(firm, guide)} />
        </div>
      )}
    </div>
  )
}
