/**
 * Resumen de la junta de descubrimiento con Claude: de la transcripción (en español) al
 * formato base, con salida JSON estructurada. Solo lo que se dijo; lo demás queda vacío.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { DiscoveryAi } from '../../src/domain/types.ts'
import { HttpError } from './http.ts'

export const MODEL = 'claude-opus-5-5'
/** Una junta larga cabe de sobra; más que esto se pide dividirla. */
export const MAX_TRANSCRIPT = 400_000

export interface DiscoveryInput {
  company: string
  contact: string
  questions: { id: string; label: string }[]
  transcript: string
}

const str = { type: 'string' } as const
export const DISCOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['resumen', 'problema', 'quien_decide', 'presupuesto', 'fechas', 'proceso_actual', 'usuarios', 'sistemas', 'riesgos', 'siguientes_pasos', 'respuestas'],
  properties: {
    resumen: str,
    problema: str,
    quien_decide: { type: 'object', additionalProperties: false, required: ['nombre', 'puesto'], properties: { nombre: str, puesto: str } },
    presupuesto: str,
    fechas: str,
    proceso_actual: str,
    usuarios: str,
    sistemas: str,
    riesgos: { type: 'array', items: str },
    siguientes_pasos: { type: 'array', items: str },
    respuestas: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'respuesta'], properties: { id: str, respuesta: str } } },
  },
}

export const SYSTEM = `Eres analista de una consultora mexicana que hace sistemas a la medida para empresas medianas.
Recibes la transcripción de una junta de descubrimiento con un prospecto y llenas el formato base del despacho.
Reglas:
- Escribe solo lo que se dijo en la junta. Si algo no se mencionó, deja el texto vacío; no supongas ni inventes cifras.
- Español de México, claro y profesional, con frases cortas.
- El problema va con las palabras del cliente, entre comillas latinas («»), y con quién lo dijo si se sabe.
- El resumen tiene de 5 a 8 frases: qué hace la empresa, el problema, cómo lo resuelven hoy, qué esperan y lo acordado.
- Contesta cada pregunta base por su id; si la junta no la cubrió, la respuesta va vacía.`

export function buildPrompt(input: DiscoveryInput): string {
  return [
    `Empresa: ${input.company || 'sin dato'}. Contacto: ${input.contact || 'sin dato'}.`,
    '',
    'Preguntas base (id: pregunta):',
    ...input.questions.map((q) => `- ${q.id}: ${q.label}`),
    '',
    '<transcripcion>',
    input.transcript,
    '</transcripcion>',
  ].join('\n')
}

const asText = (x: unknown) => (typeof x === 'string' ? x.trim() : '')

/** Revisa la forma de la respuesta (la salida estructurada la garantiza; esto cubre lo demás). */
export function validateResult(x: unknown, questionIds: string[]): DiscoveryAi {
  if (!x || typeof x !== 'object') throw new HttpError(502, 'Claude no devolvió el formato esperado.')
  const o = x as Record<string, unknown>
  const qd = (o.quien_decide ?? {}) as Record<string, unknown>
  const ids = new Set(questionIds)
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(asText).filter(Boolean) : [])
  return {
    resumen: asText(o.resumen),
    problema: asText(o.problema),
    quien_decide: { nombre: asText(qd.nombre), puesto: asText(qd.puesto) },
    presupuesto: asText(o.presupuesto),
    fechas: asText(o.fechas),
    proceso_actual: asText(o.proceso_actual),
    usuarios: asText(o.usuarios),
    sistemas: asText(o.sistemas),
    riesgos: arr(o.riesgos),
    siguientes_pasos: arr(o.siguientes_pasos),
    respuestas: (Array.isArray(o.respuestas) ? o.respuestas : [])
      .map((r) => r as Record<string, unknown>)
      .map((r) => ({ id: asText(r.id), respuesta: asText(r.respuesta) }))
      .filter((r) => ids.has(r.id)),
  }
}

/**
 * Sin ANTHROPIC_API_KEY propia, Netlify (planes por créditos) pone las de su AI Gateway: la
 * clave y ANTHROPIC_BASE_URL, que el SDK usa solo. El uso se cobra en créditos de Netlify.
 */
export function viaGateway(): boolean {
  const base = process.env.ANTHROPIC_BASE_URL?.trim()
  return Boolean(base) && !/^https:\/\/api\.anthropic\.com\/?$/.test(base!)
}

export async function summarizeDiscovery(input: DiscoveryInput): Promise<DiscoveryAi> {
  if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(501, 'El resumen con IA no está configurado: falta ANTHROPIC_API_KEY en Netlify.', 'not_configured')
  const transcript = input.transcript.trim()
  if (transcript.length < 200) throw new HttpError(400, 'La transcripción es muy corta para resumirla.')
  if (transcript.length > MAX_TRANSCRIPT) throw new HttpError(400, 'La transcripción es muy larga: divídela en partes y resume cada una.')
  const client = new Anthropic()
  const params = {
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium' as const, format: { type: 'json_schema' as const, schema: DISCOVERY_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user' as const, content: buildPrompt({ ...input, transcript }) }],
  }
  // Por el AI Gateway de Netlify no pasan encabezados beta: ahí va la llamada estándar.
  const response = viaGateway()
    ? await client.messages.create(params)
    : await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
  if (response.stop_reason === 'refusal') throw new HttpError(422, 'Claude no pudo resumir esta transcripción. Revisa el contenido o resúmela a mano.')
  if (response.stop_reason === 'max_tokens') throw new HttpError(502, 'El resumen quedó incompleto. Intenta con una transcripción más corta.')
  const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new HttpError(502, 'Claude no devolvió JSON válido.')
  }
  return validateResult(parsed, input.questions.map((q) => q.id))
}

/** Mensaje para el socio según el error (de la más específica a la más general). */
export function describeError(e: unknown): string {
  if (e instanceof HttpError) return e.message
  if (e instanceof Anthropic.AuthenticationError) return 'La clave de Anthropic no es válida: revísala en Netlify.'
  if (e instanceof Anthropic.PermissionDeniedError) return 'La clave de Anthropic no tiene permiso para este modelo.'
  if (e instanceof Anthropic.RateLimitError) return 'Se alcanzó el límite de uso de Claude: intenta en unos minutos.'
  if (e instanceof Anthropic.BadRequestError) return `Claude rechazó la solicitud: ${e.message}`
  if (e instanceof Anthropic.APIError) return `Claude respondió con error ${e.status ?? ''}: intenta de nuevo.`
  if (e instanceof Anthropic.APIConnectionError) return 'No hubo conexión con Claude: intenta de nuevo.'
  return e instanceof Error ? e.message : String(e)
}
