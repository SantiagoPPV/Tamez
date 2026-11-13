/**
 * Documentos de los formatos base (D15 a D18): secciones con preguntas y respuestas, con el
 * mismo diseño de las plantillas (base.css) y paginados en hoja carta. También la hoja de
 * constancia de firma electrónica, que se agrega a cualquier documento firmado.
 */
import { BASE_CSS } from './engine'
import { dLongCap } from './text'
import type { DocData, FormatDef, Signature, Signer } from '../domain/types'

export interface FormatMeta {
  firmName: string
  projectKey: string
  projectName: string
  client: string
  code: string
  title: string
  version: number
  dateText: string
  fileName: string
}

const FONT = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'

const EXTRA_CSS = `
.q { margin: 0 0 9pt; break-inside: avoid; }
.q .ql { font-size: 8.4pt; font-weight: 700; color: var(--ink2); margin-bottom: 2pt; }
.q .qa { white-space: pre-wrap; text-wrap: pretty; }
.q .qa.falta { background: var(--ambar-soft); color: var(--ambar); border-radius: 4px; padding: 1pt 4pt; }
.q .qa ul { margin: 0; padding-left: 14pt; }
.firmas-e { display: grid; grid-template-columns: 1fr 1fr; gap: 18pt; margin-top: 10pt; }
.firma-e { border: 1px solid var(--rule); border-radius: 8px; padding: 10pt 12pt; break-inside: avoid; }
.firma-e .n { font-weight: 700; font-size: 10pt; }
.firma-e .r { font-size: 8.2pt; color: var(--muted); }
.firma-e img { max-height: 46pt; max-width: 100%; display: block; margin: 6pt 0 2pt; }
.firma-e .linea { border-bottom: 1px solid var(--ink); height: 34pt; margin: 6pt 0 2pt; }
.firma-e .ok { font-size: 8.2pt; color: var(--accent-2); font-weight: 600; }
.firma-e .det { font-size: 7.4pt; color: var(--muted); line-height: 1.4; word-break: break-all; }
`

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Texto a HTML: renglones que empiezan con guion se vuelven lista. */
function richText(text: string): string {
  const ls = text.split('\n')
  const out: string[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) out.push(`<ul>${list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`)
    list = []
  }
  for (const raw of ls) {
    const l = raw.trim()
    if (/^[-•*]\s+/.test(l)) list.push(l.replace(/^[-•*]\s+/, ''))
    else {
      flush()
      if (l) out.push(esc(l))
    }
  }
  flush()
  return out.join('<br>')
}

/* Paginación por estimación: alto disponible de la hoja y alto aproximado de cada bloque (pt). */
const PAGE_BODY = 640
const CHARS_PER_LINE = 92
const textLines = (t: string) => t.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / CHARS_PER_LINE)), 0)

interface Block {
  html: string
  height: number
  /** Un título no se queda solo al final de una hoja */
  keepWithNext?: boolean
}

function paginate(blocks: Block[]): string[][] {
  const pages: string[][] = [[]]
  let used = 0
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const need = b.keepWithNext && blocks[i + 1] ? b.height + Math.min(blocks[i + 1].height, 60) : b.height
    if (used + need > PAGE_BODY && used > 0) {
      pages.push([])
      used = 0
    }
    pages[pages.length - 1].push(b.html)
    used += b.height
  }
  return pages
}

function shell(meta: FormatMeta, pages: string[][]): string {
  const total = pages.length
  const body = pages
    .map(
      (blocks, i) => `<section class="page">
  <div class="hdr"><span>${esc(meta.code)} · ${esc(meta.title)}</span><span>${esc(meta.projectKey)} · ${esc(meta.client)}</span></div>
  ${blocks.join('\n  ')}
  <div class="ftr"><span><b>${esc(meta.firmName)}</b> · ${esc(meta.fileName)}</span><span>${i + 1} / ${total}</span></div>
</section>`,
    )
    .join('\n')
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(meta.fileName)}</title>
<link rel="stylesheet" href="${FONT}"><style>${BASE_CSS}${EXTRA_CSS}</style></head>
<body>
${body}
</body></html>`
}

/** Bloques de la constancia de firma electrónica. */
function signatureBlocks(signers: Signer[], signatures: Signature[], hash: string | null): Block[] {
  if (!signers.length) return []
  const cards = signers.map((s) => {
    const sig = signatures.find((x) => x.signerId === s.id) ?? signatures.find((x) => x.signerEmail && x.signerEmail.toLowerCase() === s.email.toLowerCase() && x.kind === s.kind)
    const when = sig ? new Date(sig.signedAt) : null
    const fecha = when
      ? new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(when)
      : ''
    return `<div class="firma-e">
      <div class="n">${esc(sig?.signerName || s.name)}</div><div class="r">${esc(s.role)}</div>
      ${sig?.drawing ? `<img src="${esc(sig.drawing)}" alt="Firma">` : sig ? '' : '<div class="linea"></div>'}
      ${
        sig
          ? `<div class="ok">Firmado electrónicamente el ${esc(fecha)} (hora del centro de México)</div>
      <div class="det">Correo verificado: ${esc(sig.signerEmail)} · ${sig.method === 'portal' ? 'Portal del cliente' : 'Sistema del despacho'}<br>Huella del documento (SHA-256): ${esc(sig.documentHash)}</div>`
          : '<div class="r">Pendiente de firma</div>'
      }
    </div>`
  })
  return [
    { html: '<h2 class="s"><span class="n">✓</span>Firmas</h2>', height: 34, keepWithNext: true },
    {
      html: `<p class="small muted" style="margin:0 0 4pt;">Firma electrónica simple: cada firmante entró con su correo verificado, revisó esta versión y la aceptó. La huella identifica el contenido firmado; si el documento cambia, cambia la huella.${hash ? ` Huella de esta versión: <span class="num">${esc(hash)}</span>.` : ''}</p>`,
      height: 40,
    },
    ...chunk(cards, 2).map((pair) => ({ html: `<div class="firmas-e">${pair.join('')}</div>`, height: 150 })),
  ]
}

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))

const YES_NO: Record<string, string> = { yes: 'Sí', no: 'No', pending: 'Por confirmar' }

/** Un formato lleno, como documento. */
export function renderFormatDoc(
  def: FormatDef,
  data: DocData,
  meta: FormatMeta,
  opts: { markMissing?: boolean; signers?: Signer[]; signatures?: Signature[]; hash?: string | null } = {},
): { html: string; missing: string[] } {
  const missing: string[] = []
  const blocks: Block[] = []
  const intro = data.fields.__intro || def.intro
  blocks.push({
    html: `<div class="doc-head"><div class="eyebrow">${esc(meta.code)} · ${esc(meta.title)}</div>
    <h1>${esc(meta.projectName || meta.client)}</h1>
    <p class="sub">${esc(intro)}</p>
    <p class="small muted" style="margin:0;">${esc(meta.client)} · ${esc(meta.projectKey)} · Versión ${meta.version} · ${esc(meta.dateText)}</p></div>`,
    height: 70 + textLines(intro) * 16,
  })
  const summary = (data.fields.resumen ?? '').trim()
  if (summary) blocks.push({ html: `<div class="callout" style="margin:4pt 0 10pt;"><div class="k">Resumen</div><div class="v" style="font-size:10pt;font-weight:500;">${richText(summary)}</div></div>`, height: 34 + textLines(summary) * 15 })
  def.sections.forEach((s, i) => {
    blocks.push({ html: `<h2 class="s"><span class="n">${i + 1}</span>${esc(s.title)}</h2>`, height: 30, keepWithNext: true })
    if (s.hint) blocks.push({ html: `<p class="small muted" style="margin:0 0 6pt;">${esc(s.hint)}</p>`, height: 16 })
    for (const q of s.questions) {
      let value = (data.fields[q.id] ?? '').trim()
      if (q.kind === 'yesno' && YES_NO[value]) value = YES_NO[value]
      if (q.kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) value = dLongCap(value)
      if (!value) missing.push(q.id)
      const answer = value ? richText(value) : opts.markMissing ? 'Falta capturar' : '—'
      blocks.push({
        html: `<div class="q"><div class="ql">${esc(q.label)}</div><div class="qa${!value && opts.markMissing ? ' falta' : ''}">${answer}</div></div>`,
        height: 12 + textLines(q.label) * 11 + textLines(value || '—') * 14,
      })
    }
  })
  blocks.push(...signatureBlocks(opts.signers ?? [], opts.signatures ?? [], opts.hash ?? null))
  return { html: shell(meta, paginate(blocks)), missing }
}

/** Agrega la hoja de constancia de firma al final de un documento de plantilla (D02, D07…). */
export function appendSignaturePage(html: string, meta: FormatMeta, signers: Signer[], signatures: Signature[], hash: string | null): string {
  if (!signers.length) return html
  const pages = paginate(signatureBlocks(signers, signatures, hash))
  const total = (html.match(/<section class="page/g) ?? []).length + pages.length
  let n = total - pages.length
  const sections = pages
    .map((blocks) => {
      n += 1
      return `<section class="page"><style>${EXTRA_CSS}</style>
  <div class="hdr"><span>${esc(meta.code)} · ${esc(meta.title)}</span><span>Constancia de firma</span></div>
  ${blocks.join('\n  ')}
  <div class="ftr"><span><b>${esc(meta.firmName)}</b> · ${esc(meta.fileName)}</span><span>${n} / ${total}</span></div>
</section>`
    })
    .join('\n')
  // Los pies de las hojas de la plantilla cuentan también la hoja de firmas.
  const renumbered = html.replace(/(\d+) \/ \d+(<\/span><\/div>\s*<\/section>)/g, `$1 / ${total}$2`)
  return renumbered.replace(/<\/body>/i, `${sections}\n</body>`)
}

/** Huella SHA-256 de un contenido (en la demostración; en la base la calcula el servidor). */
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** JSON con llaves ordenadas: la misma huella para el mismo contenido. */
export function canonicalJson(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonicalJson).join(',')}]`
  if (x && typeof x === 'object')
    return `{${Object.keys(x as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((x as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(x ?? null)
}
