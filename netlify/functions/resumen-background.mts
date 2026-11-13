/**
 * Función de fondo (hasta 15 minutos): resume con Claude la transcripción de la junta de
 * descubrimiento. Quien llama recibe 202 de inmediato; el resultado queda en sam_ai_jobs,
 * que la pantalla consulta hasta que termina.
 */
import { requireStaff, rest } from '../lib/auth.ts'
import { describeError, summarizeDiscovery, type DiscoveryInput } from '../lib/discovery.ts'

interface JobRow {
  id: string
  status: string
  input: DiscoveryInput
}

export default async (req: Request) => {
  let caller: Awaited<ReturnType<typeof requireStaff>>
  let jobId = ''
  try {
    caller = await requireStaff(req)
    jobId = String(((await req.json()) as { jobId?: string }).jobId ?? '')
  } catch (e) {
    console.error('resumen: sin acceso', e)
    return
  }
  const path = `sam_ai_jobs?id=eq.${encodeURIComponent(jobId)}`
  const patch = (body: Record<string, unknown>) => rest(caller, path, { method: 'PATCH', body })
  try {
    const [job] = await rest<JobRow[]>(caller, `${path}&select=id,status,input`)
    // Se reintenta solo lo que no terminó (Netlify repite la función si falla).
    if (!job || job.status === 'done') return
    await patch({ status: 'running', error: '' })
    const result = await summarizeDiscovery(job.input)
    await patch({ status: 'done', result, finished_at: new Date().toISOString() })
  } catch (e) {
    await patch({ status: 'error', error: describeError(e), finished_at: new Date().toISOString() }).catch((x) => console.error(x))
  }
}
