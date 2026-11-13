/** Manda un correo del sistema (acta firmada, minuta de arranque, avisos, invitaciones). */
import { requireStaff } from '../lib/auth.ts'
import { handle, json, readJson } from '../lib/http.ts'
import { sendMail, type Mail } from '../lib/mail.ts'

export default async (req: Request) =>
  handle(async () => {
    await requireStaff(req)
    const mail = await readJson<Mail>(req)
    const sent = await sendMail(mail)
    return json(200, { ok: true, ...sent })
  })
