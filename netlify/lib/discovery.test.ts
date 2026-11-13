import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildPrompt, DISCOVERY_SCHEMA, MODEL, validateResult, viaGateway } from './discovery.ts'

describe('Resumen de la junta de descubrimiento con Claude', () => {
  it('usa el modelo más reciente y un esquema estricto', () => {
    expect(MODEL).toBe('claude-opus-5-5')
    expect(DISCOVERY_SCHEMA.additionalProperties).toBe(false)
    expect(DISCOVERY_SCHEMA.required).toEqual(Object.keys(DISCOVERY_SCHEMA.properties))
  })

  afterEach(() => vi.unstubAllEnvs())

  it('distingue la clave propia del AI Gateway de Netlify', () => {
    vi.stubEnv('ANTHROPIC_BASE_URL', '')
    expect(viaGateway()).toBe(false)
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://api.anthropic.com')
    expect(viaGateway()).toBe(false)
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://ai-gateway.netlify.example/anthropic')
    expect(viaGateway()).toBe(true)
  })

  it('manda las preguntas base y la transcripción entre etiquetas', () => {
    const prompt = buildPrompt({ company: 'Cliente Ejemplo', contact: 'Ricardo Solís', questions: [{ id: 'problema', label: '¿Qué problema quieren resolver?' }], transcript: 'Hola, contamos a mano.' })
    expect(prompt).toContain('- problema: ¿Qué problema quieren resolver?')
    expect(prompt).toContain('<transcripcion>\nHola, contamos a mano.\n</transcripcion>')
  })

  it('limpia la respuesta y descarta preguntas que no existen', () => {
    const r = validateResult(
      {
        resumen: '  Resumen. ',
        problema: '«Contamos a mano»',
        quien_decide: { nombre: 'Ricardo', puesto: 'Director' },
        presupuesto: '',
        fechas: '',
        proceso_actual: '',
        usuarios: '',
        sistemas: '',
        riesgos: ['  Conexión ', ''],
        siguientes_pasos: [],
        respuestas: [
          { id: 'problema', respuesta: ' Contar a mano ' },
          { id: 'inventada', respuesta: 'x' },
        ],
      },
      ['problema'],
    )
    expect(r.resumen).toBe('Resumen.')
    expect(r.riesgos).toEqual(['Conexión'])
    expect(r.respuestas).toEqual([{ id: 'problema', respuesta: 'Contar a mano' }])
    expect(() => validateResult(null, [])).toThrow()
  })
})
