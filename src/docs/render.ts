/**
 * Arma el HTML de cualquier documento (plantilla D01–D14 o formato D15–D18), con la hoja
 * de constancia de firma si lleva firmantes. Lo usan el editor, el portal y la liga.
 */
import { DOCUMENTS } from '../domain/catalogs'
import { getFormat } from '../domain/formats'
import type { DocData, DocumentCode, FirmSettings, FormatDef, Signature, Signer } from '../domain/types'
import { fillTemplate, loadTemplate } from './engine'
import { appendSignaturePage, renderFormatDoc, type FormatMeta } from './formatDoc'

export interface RenderInput {
  code: DocumentCode
  data: DocData
  meta: Omit<FormatMeta, 'code' | 'title'>
  firm?: Pick<FirmSettings, 'formats'> | null
  signers?: Signer[]
  signatures?: Signature[]
  hash?: string | null
  markMissing?: boolean
}

/** Definición del formato: la congelada en el documento, o la vigente del despacho. */
export function formatDefOf(code: DocumentCode, data: DocData, firm?: Pick<FirmSettings, 'formats'> | null): FormatDef | null {
  const fmt = DOCUMENTS[code].format
  if (!fmt) return null
  const frozen = data.fields.__def
  if (frozen) {
    try {
      return JSON.parse(frozen) as FormatDef
    } catch {
      /* se usa la vigente */
    }
  }
  return getFormat(firm, fmt)
}

const cache = new Map<string, string>()
async function template(name: string) {
  if (!cache.has(name)) cache.set(name, await loadTemplate(name))
  return cache.get(name)!
}

export async function renderDocument(input: RenderInput): Promise<{ html: string; missing: string[] }> {
  const def = DOCUMENTS[input.code]
  const meta: FormatMeta = { ...input.meta, code: input.code, title: def.title }
  const fmt = formatDefOf(input.code, input.data, input.firm)
  if (fmt)
    return renderFormatDoc(fmt, input.data, meta, { markMissing: input.markMissing, signers: input.signers, signatures: input.signatures, hash: input.hash })
  if (!def.template) return { html: '', missing: [] }
  const tpl = await template(def.template)
  const pages = (tpl.match(/<section class="page/g) ?? []).length
  const data = input.data.fields['documento.hoja_firmas'] ? input.data : { ...input.data, fields: { ...input.data.fields, 'documento.hoja_firmas': String(input.signers?.length ? pages + 1 : pages) } }
  const filled = fillTemplate(tpl, data, { markMissing: input.markMissing, headerRight: `${meta.projectKey} · ${meta.client}` })
  return { html: appendSignaturePage(filled.html, meta, input.signers ?? [], input.signatures ?? [], input.hash ?? null), missing: filled.missing }
}
