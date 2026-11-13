import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../app/session'
import { useGlobal } from '../app/useGlobal'
import type { AppNotification } from '../domain/types'
import { Bell, BellRing, CircleDollarSign, DoorOpen, FileSignature, ShieldCheck, Sparkles } from 'lucide-react'
import { Button, cx, Drawer, EmptyState, IconBox, type Tone } from '../ui/kit'

const when = (iso: string) => new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

const KIND: Record<string, { icon: ReactNode; tone: Tone }> = {
  new_client: { icon: <Sparkles />, tone: 'green' },
  validation: { icon: <ShieldCheck />, tone: 'amber' },
  gate: { icon: <DoorOpen />, tone: 'navy' },
  signature: { icon: <FileSignature />, tone: 'navy' },
  payment: { icon: <CircleDollarSign />, tone: 'green' },
  other: { icon: <Bell />, tone: 'gray' },
}

/** Avisos para los socios: nuevo cliente para Operaciones, propuestas por validar, puertas, firmas. */
export function NotificationsBell() {
  const { session } = useSession()
  const me = session.status === 'ready' ? (session.userId ?? 'demo') : 'demo'
  const list = useGlobal('notifications')
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const t = window.setInterval(() => void list.reload(), 60_000)
    return () => window.clearInterval(t)
  }, [list.reload]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = list.rows ?? []
  const unread = rows.filter((n) => !n.readBy.includes(me))
  const read = (n: AppNotification) => (n.readBy.includes(me) ? Promise.resolve(n) : list.save({ ...n, readBy: [...n.readBy, me] }))
  return (
    <>
      <button type="button" className="relative rounded-lg p-2 text-ink2 transition-colors hover:bg-soft hover:text-ink" onClick={() => setOpen(true)} aria-label={`Avisos${unread.length ? `: ${unread.length} sin leer` : ''}`}>
        {unread.length > 0 ? <BellRing className="size-5" aria-hidden /> : <Bell className="size-5" aria-hidden />}
        {unread.length > 0 && <span className="num absolute -top-0.5 -right-0.5 grid min-w-[18px] place-items-center rounded-full bg-rojo px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">{unread.length}</span>}
      </button>
      {open && (
        <Drawer
          open
          onClose={() => setOpen(false)}
          title="Avisos"
          subtitle="Nuevos clientes, validaciones, puertas y firmas"
          footer={
            unread.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => void Promise.all(unread.map(read))}>
                Marcar todo como leído
              </Button>
            )
          }
        >
          {rows.length === 0 ? (
            <EmptyState icon={<Bell />} title="Sin avisos">
              Aquí llegan los clientes nuevos, las propuestas por validar, las puertas y las firmas.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {rows.map((n) => {
                const seen = n.readBy.includes(me)
                const k = KIND[n.kind] ?? KIND.other
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cx('flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:border-accent-mid', seen ? 'border-rule bg-white' : 'border-accent-mid bg-accent-soft/50')}
                      onClick={() =>
                        void read(n).then(() => {
                          setOpen(false)
                          if (n.link) navigate(n.link)
                        })
                      }
                    >
                      <IconBox tone={k.tone} size="sm">
                        {k.icon}
                      </IconBox>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                          {n.title}
                          {!seen && <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="sin leer" />}
                        </span>
                        {n.body && <span className="block text-xs text-ink2">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-muted">{when(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Drawer>
      )}
    </>
  )
}
