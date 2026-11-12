// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { buildCeInv, buildDemoProposals, buildDemoProspects, DEMO_FIRM } from '../data/ceinv'
import { DOCUMENTS } from '../domain/catalogs'
import type { DocumentCode, ProjectDocument } from '../domain/types'
import { autofill, fileBase, resolveDoc, type DocEnv } from './autofill'
import { fillTemplate, loadTemplate, templateSchema } from './engine'

const env = (): DocEnv => ({ data: buildCeInv(), firm: DEMO_FIRM, proposals: buildDemoProposals(), prospects: buildDemoProspects(), today: '2027-02-12' })
const newDoc = (code: DocumentCode, context: ProjectDocument['context'] = {}): ProjectDocument => ({
  id: `t-${code}`,
  code,
  version: 1,
  status: 'draft',
  context,
  overrides: { fields: {}, lists: {} },
  snapshot: null,
  createdOn: '2027-02-12',
  sentOn: null,
  signedOn: null,
  notes: '',
})

async function render(code: DocumentCode, context: ProjectDocument['context'] = {}) {
  const e = env()
  const doc = newDoc(code, context)
  const data = resolveDoc(doc, e)
  const html = await loadTemplate(DOCUMENTS[code].template!)
  const out = fillTemplate(html, data, { markMissing: true, headerRight: `${e.data.project.key} · ${e.data.project.client}` })
  const dom = new DOMParser().parseFromString(out.html, 'text/html')
  const val = (name: string) => dom.querySelector(`[data-campo="${name}"]`)?.textContent ?? null
  const rows = (list: string) => dom.querySelector(`[data-lista="${list}"]`)?.children.length ?? 0
  return { e, doc, data, out, dom, val, rows }
}

describe('Generador de documentos (versión 2)', () => {
  it('nombra el archivo clave-código-nombre-versión', () => {
    const e = env()
    expect(fileBase(newDoc('D02'), e.data)).toBe('CE-INV-D02-acta-de-inicio-v1')
    expect(fileBase(newDoc('D06', { week: 5 }), e.data)).toBe('CE-INV-D06-reporte-semanal-05-v1')
    expect(fileBase(newDoc('D07', { milestoneId: 'ms-h1' }), e.data)).toBe('CE-INV-D07-acta-de-aceptacion-hito-1-v1')
  })

  it('las doce plantillas se llenan sin errores y cambian el encabezado de ejemplo', async () => {
    for (const code of Object.keys(DOCUMENTS) as DocumentCode[]) {
      if (!DOCUMENTS[code].template) continue
      const ctx = DOCUMENTS[code].context === 'milestone' ? { milestoneId: 'ms-h1' } : DOCUMENTS[code].context === 'week' ? { cutoff: '2027-02-12', week: 5 } : DOCUMENTS[code].context === 'month' ? { month: '2027-05' } : DOCUMENTS[code].context === 'change' ? { changeId: 'c-1' } : DOCUMENTS[code].context === 'proposal' ? { proposalId: 'pr-ceinv', variant: 'definitiva' as const } : {}
      const { out, dom } = await render(code, ctx)
      expect(out.html, code).not.toContain('Ejemplo · Cliente Ejemplo')
      expect(dom.querySelectorAll('section.page').length, code).toBeGreaterThan(0)
    }
  })

  it('D02 acta de inicio: datos del proyecto, cinco tramos, cuatro pagos y los papeles del cliente', async () => {
    const { val, rows } = await render('D02')
    expect(val('proyecto.clave')).toBe('CE-INV')
    expect(val('cliente.nombre')).toBe('Cliente Ejemplo, S.A. de C.V.')
    expect(val('proyecto.precio_total')).toBe('$330,000')
    expect(val('proyecto.fecha_arranque')).toBe('lunes 11 de enero de 2027')
    expect(val('facturacion.rfc')).toBe('CEJ150302AB4')
    expect(rows('hitos')).toBe(5)
    expect(rows('pagos')).toBe(4)
    expect(rows('roles')).toBe(4)
    expect(rows('alcance_incluye')).toBe(7)
  })

  it('D06 reporte semanal 5: semáforo, avance por hito y pendientes al corte', async () => {
    const { val, rows, dom } = await render('D06', { cutoff: '2027-02-12', week: 5 })
    expect(val('reporte.numero')).toBe('5')
    expect(val('semaforo.color')).toBe('Verde')
    expect(rows('hitos')).toBe(3)
    const h1 = dom.querySelector('[data-lista="hitos"] tr')!
    expect(h1.textContent).toContain('Entregado')
    expect(h1.querySelector('[data-campo="hito.avance_contra_plan"]')?.textContent).toBe('0.99')
    expect(rows('pendientes')).toBe(1)
    expect(val('bolsa.horas_usadas')).toBe('3')
    expect(val('bolsa.horas_totales')).toBe('34')
  })

  it('D04 especificación del Hito 1: criterios de aceptación', async () => {
    const { val, rows } = await render('D04', { milestoneId: 'ms-h1' })
    expect(val('hito.nombre')).toBe('Prueba piloto en un almacén')
    expect(rows('criterios')).toBe(4)
  })

  it('lo capturado en el documento manda sobre lo que se llena solo', () => {
    const e = env()
    const doc = newDoc('D02')
    doc.overrides.fields['proyecto.nombre'] = 'Otro nombre'
    expect(resolveDoc(doc, e).fields['proyecto.nombre']).toBe('Otro nombre')
    expect(autofill(doc, e).fields['proyecto.nombre']).toBe('Control de inventario en almacenes')
  })

  it('un documento enviado se ve como se congeló', () => {
    const e = env()
    const doc = { ...newDoc('D02'), status: 'sent' as const, snapshot: { fields: { 'proyecto.nombre': 'Congelado' }, lists: {} } }
    expect(resolveDoc(doc, e).fields['proyecto.nombre']).toBe('Congelado')
  })

  it('el esquema lista los campos y las listas de la plantilla', async () => {
    const s = templateSchema(await loadTemplate('D06-reporte-semanal'))
    expect(s.lists.map((l) => l.name)).toEqual(['hitos', 'hechos', 'siguientes', 'pendientes', 'riesgos', 'cambios'])
    expect(s.scalars.some((f) => f.name === 'semaforo.color')).toBe(true)
  })
})
