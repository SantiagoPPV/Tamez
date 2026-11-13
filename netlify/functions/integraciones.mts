/** Qué integraciones están listas (sin mostrar ninguna clave). */
import { requireStaff } from '../lib/auth.ts'
import { facturapiMode } from '../lib/facturapi.ts'
import { viaGateway } from '../lib/discovery.ts'
import { env, handle, json } from '../lib/http.ts'
import { emailProvider } from '../lib/mail.ts'

export default async (req: Request) =>
  handle(async () => {
    await requireStaff(req)
    const provider = emailProvider()
    return json(200, {
      email: provider,
      emailFrom: provider === 'google' ? env('GOOGLE_SENDER') ?? null : env('EMAIL_FROM') ?? null,
      ai: Boolean(env('ANTHROPIC_API_KEY')),
      aiGateway: Boolean(env('ANTHROPIC_API_KEY')) && viaGateway(),
      facturapi: facturapiMode(),
    })
  })
