/** Respuestas y errores de las funciones del servidor. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = 'error',
  ) {
    super(message)
  }
}

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

/** Corre la función y convierte cualquier error en una respuesta con mensaje en español. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message, code: e.code })
    console.error(e)
    return json(500, { error: `Error del servidor: ${e instanceof Error ? e.message : String(e)}`, code: 'error' })
  }
}

/** La primera variable de entorno que exista. */
export function env(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v.trim()
  }
  return undefined
}

export async function readJson<T>(req: Request): Promise<T> {
  if (req.method !== 'POST') throw new HttpError(405, 'Usa POST.')
  try {
    return (await req.json()) as T
  } catch {
    throw new HttpError(400, 'El cuerpo no es JSON válido.')
  }
}
