import { describe, expect, it } from 'vitest'
import { DEFAULT_FORMATS } from '../domain/formats'
import type { Signature, Signer } from '../domain/types'
import { appendSignaturePage, canonicalJson, renderFormatDoc, sha256 } from './formatDoc'

const meta = { firmName: 'Sistemas a la medida', projectKey: 'CE-INV', projectName: 'Control de inventario', client: 'Cliente Ejemplo', code: 'D17', title: 'Minuta de la junta de arranque', version: 2, dateText: '8 de enero de 2027', fileName: 'CE-INV-D17-junta-de-arranque-v2' }
const signers: Signer[] = [
  { id: 's1', kind: 'client', name: 'Ricardo Solís', email: 'rsolis@clienteejemplo.mx', role: 'Por el cliente' },
  { id: 's2', kind: 'firm', name: 'Santiago', email: 'socio@sistemasalamedida.mx', role: 'Por el despacho' },
]
const sig: Signature = { id: 'g1', documentId: 'd1', documentVersion: 2, documentHash: 'a'.repeat(64), signerId: 's1', signerName: 'Ricardo Solís', signerEmail: 'rsolis@clienteejemplo.mx', signerRole: 'Por el cliente', kind: 'client', signedAt: '2027-01-08T17:30:00Z', method: 'portal', drawing: null, userAgent: '' }

describe('Formatos base y firma electrónica', () => {
  it('el formato lleva sus secciones, preguntas y respuestas, y marca lo que falta', () => {
    const { html, missing } = renderFormatDoc(DEFAULT_FORMATS.D17, { fields: { plan: '- Hito 1\n- Hito 2', fecha: '2027-01-08' }, lists: {} }, meta, { markMissing: true })
    expect(html).toContain('Reglas de aceptación')
    expect(html).toContain('<ul><li>Hito 1</li><li>Hito 2</li></ul>')
    expect(html).toContain('8 de enero de 2027')
    expect(missing).toContain('acuerdos')
    expect(missing).not.toContain('plan')
    expect(html).toContain('Falta capturar')
  })

  it('pagina en hoja carta cuando no cabe', () => {
    const long = Array.from({ length: 60 }, (_, i) => `Renglón ${i + 1} con suficiente texto para ocupar un renglón completo del documento.`).join('\n')
    const { html } = renderFormatDoc(DEFAULT_FORMATS.D18, { fields: { proceso: long, usuarios: long }, lists: {} }, { ...meta, code: 'D18', title: 'Diagnóstico' })
    const pages = (html.match(/<section class="page">/g) ?? []).length
    expect(pages).toBeGreaterThan(2)
    expect(html).toContain(`1 / ${pages}`)
    expect(html).toContain(`${pages} / ${pages}`)
  })

  it('la constancia muestra quién firmó, cuándo, con qué correo y la huella', () => {
    const { html } = renderFormatDoc(DEFAULT_FORMATS.D17, { fields: {}, lists: {} }, meta, { signers, signatures: [sig], hash: sig.documentHash })
    expect(html).toContain('Firmado electrónicamente')
    expect(html).toContain('rsolis@clienteejemplo.mx')
    expect(html).toContain('a'.repeat(64))
    expect(html).toContain('Pendiente de firma') // Santiago todavía no firma
  })

  it('a una plantilla se le agrega la hoja de firmas y se recuentan las hojas', () => {
    const tpl = '<html><body><section class="page"><div class="ftr"><span>x</span><span>1 / 2</span></div>\n</section><section class="page"><div class="ftr"><span>x</span><span>2 / 2</span></div>\n</section></body></html>'
    const out = appendSignaturePage(tpl, { ...meta, code: 'D02', title: 'Acta de inicio' }, signers, [sig], sig.documentHash)
    expect(out).toContain('1 / 3')
    expect(out).toContain('2 / 3')
    expect(out).toContain('3 / 3')
    expect(out).toContain('Constancia de firma')
    expect(appendSignaturePage(tpl, { ...meta, code: 'D02', title: 'Acta de inicio' }, [], [], null)).toBe(tpl)
  })

  it('la misma huella para el mismo contenido, sin importar el orden de las llaves', async () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } })).toBe('{"a":{"c":null,"d":[2,{"y":2,"z":1}]},"b":1}')
    expect(await sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(await sha256(canonicalJson({ x: 1, y: 2 }))).toBe(await sha256(canonicalJson({ y: 2, x: 1 })))
  })
})
