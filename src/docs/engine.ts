/**
 * Motor de plantillas: toma el HTML con data-campo y data-lista (GUIA.md) y lo llena.
 * - Cada contenedor data-lista repite su primer hijo una vez por renglón.
 * - Una lista anidada busca primero «padre.índice.nombre» y luego «nombre».
 * - Sin datos para una lista, se deja un renglón llenado con los campos sueltos.
 * - Un campo sin valor queda vacío; en la vista previa se marca para capturarlo.
 */
import baseCss from './plantillas/base.css?raw'
import type { DocData } from '../domain/types'

const loaders = import.meta.glob('./plantillas/*.html', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>

export async function loadTemplate(name: string): Promise<string> {
  const loader = loaders[`./plantillas/${name}.html`]
  if (!loader) throw new Error(`No existe la plantilla ${name}`)
  return loader()
}

export const BASE_CSS = baseCss

export interface FieldInfo {
  name: string
  example: string
}
export interface ListInfo {
  name: string
  parent: string | null
  fields: FieldInfo[]
}
export interface TemplateSchema {
  scalars: FieldInfo[]
  lists: ListInfo[]
}

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

function parentList(el: Element): Element | null {
  return el.parentElement?.closest('[data-lista]') ?? null
}

/** Campos y listas de una plantilla, con el texto de ejemplo de CE-INV. */
export function templateSchema(html: string): TemplateSchema {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const lists = new Map<string, ListInfo>()
  for (const el of doc.querySelectorAll('[data-lista]')) {
    const name = el.getAttribute('data-lista')!
    const parent = parentList(el)?.getAttribute('data-lista') ?? null
    if (!lists.has(name)) lists.set(name, { name, parent, fields: [] })
  }
  const scalars = new Map<string, FieldInfo>()
  for (const el of doc.querySelectorAll('[data-campo]')) {
    const name = el.getAttribute('data-campo')!
    const list = el.closest('[data-lista]')
    if (list) {
      const info = lists.get(list.getAttribute('data-lista')!)!
      if (!info.fields.some((f) => f.name === name)) info.fields.push({ name, example: text(el) })
    } else if (!scalars.has(name)) scalars.set(name, { name, example: text(el) })
  }
  return { scalars: [...scalars.values()], lists: [...lists.values()] }
}

export interface FillOptions {
  /** Vista previa: marca en amarillo los campos sin valor */
  markMissing?: boolean
  /** Texto a la derecha del encabezado de cada hoja (en las plantillas: «Ejemplo · Cliente Ejemplo») */
  headerRight?: string
}

/** Algunos campos se escriben distinto en otra plantilla. */
const ALIASES: Record<string, string> = { 'supuesto.texto': 'supuesto.hecho', 'pendiente.quien': 'pendiente.responsable' }

const PREVIEW_CSS = `
@media screen {
  html { background: #cbd5e1; }
  body { padding: 16px 0; }
  .page { margin: 0 auto 16px; background: #fff; box-shadow: 0 1px 4px rgba(15,23,42,.18); }
}
.falta { background: #fef3c7; outline: 1px dashed #b45309; border-radius: 2px; }
@media screen { .falta:empty::after { content: attr(data-campo); color: #b45309; font-size: 7pt; font-family: ui-monospace, monospace; } }
@media print { .falta { background: none; outline: none; } }
`

function fillRows(doc: Document, scope: Element, data: DocData, missing: Set<string>, ctx: { parent?: string; index?: number; row?: Record<string, string> }) {
  const containers = [...scope.querySelectorAll('[data-lista]')].filter((el) => {
    const anc = parentList(el)
    return !anc || !scope.contains(anc) || anc === scope
  })
  for (const container of containers) {
    const name = container.getAttribute('data-lista')!
    const key = ctx.parent != null && ctx.index != null ? `${ctx.parent}.${ctx.index}.${name}` : null
    const rows = (key && data.lists[key]) || data.lists[name]
    const proto = container.firstElementChild
    if (!proto) continue
    const protoClone = proto.cloneNode(true) as Element
    while (container.firstChild) container.removeChild(container.firstChild)
    const list = rows ?? [ctx.row ?? {}]
    list.forEach((row, i) => {
      const el = protoClone.cloneNode(true) as Element
      fillRows(doc, el, data, missing, { parent: name, index: i, row })
      for (const span of el.querySelectorAll('[data-campo]:not([data-filled])')) {
        const field = span.getAttribute('data-campo')!
        const v = row[field] ?? row[ALIASES[field] ?? ''] ?? data.fields[field] ?? ctx.row?.[field]
        setValue(span, v, missing)
      }
      container.appendChild(el)
      if (i < list.length - 1) container.appendChild(doc.createTextNode('\n'))
    })
  }
}

function setValue(span: Element, v: string | undefined, missing: Set<string>) {
  span.setAttribute('data-filled', '1')
  if (v == null || v === '') {
    span.textContent = ''
    span.classList.add('falta')
    missing.add(span.getAttribute('data-campo')!)
  } else {
    span.textContent = v
    span.classList.remove('falta')
  }
}

const SEM: [RegExp, string][] = [
  [/rojo|vencid|no cumple|fuera de meta/i, ' rojo'],
  [/amarillo|en curso|en pruebas|en revisi|pendiente|por cobrar/i, ' amarillo'],
  [/sin dato|sin iniciar|por facturar|no aplica/i, ' gris'],
]

function decorate(doc: Document, opts: FillOptions) {
  if (opts.headerRight != null) for (const el of doc.querySelectorAll('.hdr > span:last-child')) el.textContent = opts.headerRight
  for (const el of doc.querySelectorAll('.sem')) {
    const t = text(el)
    const extra = SEM.find(([re]) => re.test(t))?.[1] ?? ''
    el.className = `sem${extra}`
  }
  for (const bar of doc.querySelectorAll('.barra')) {
    const row = bar.closest('tr, li, .hito, .kv, div[data-lista] > *') ?? bar.parentElement
    if (!row) continue
    const num = (suffix: string) => {
      const el = [...row.querySelectorAll('[data-campo]')].find((x) => x.getAttribute('data-campo')!.endsWith(suffix))
      const n = el ? parseFloat(text(el).replace(',', '.')) : NaN
      return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null
    }
    const real = num('avance_real')
    const plan = num('avance_planeado')
    const i = bar.querySelector('i')
    if (i && real != null) i.setAttribute('style', `width:${real}%`)
    const b = bar.querySelector('b')
    if (b && plan != null) b.setAttribute('style', `left:${plan}%`)
    if (b && plan == null) b.remove()
  }
  for (const chip of doc.querySelectorAll('.chip')) {
    const t = text(chip)
    if (/sin atraso|ninguna|^0$/i.test(t)) chip.className = 'chip ok'
    else if (/d[ií]as? h[áa]bil|vencid/i.test(t)) chip.className = 'chip alerta'
  }
}

/** Llena una plantilla. Devuelve el HTML completo y los campos que quedaron sin valor. */
export function fillTemplate(html: string, data: DocData, opts: FillOptions = {}): { html: string; missing: string[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) link.remove()
  const head = doc.head
  const font = doc.createElement('link')
  font.rel = 'stylesheet'
  font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
  head.appendChild(font)
  const style = doc.createElement('style')
  style.textContent = baseCss + (opts.markMissing ? PREVIEW_CSS : PREVIEW_CSS.replace(/\.falta[^}]*}/g, ''))
  head.appendChild(style)
  const missing = new Set<string>()
  fillRows(doc, doc.body, data, missing, {})
  for (const span of doc.querySelectorAll('[data-campo]:not([data-filled])')) setValue(span, data.fields[span.getAttribute('data-campo')!], missing)
  for (const span of doc.querySelectorAll('[data-filled]')) span.removeAttribute('data-filled')
  if (!opts.markMissing) for (const el of doc.querySelectorAll('.falta')) el.classList.remove('falta')
  decorate(doc, opts)
  return { html: `<!doctype html>\n${doc.documentElement.outerHTML}`, missing: [...missing] }
}

export function pageCount(html: string): number {
  return (html.match(/<section class="page/g) ?? []).length || 1
}
