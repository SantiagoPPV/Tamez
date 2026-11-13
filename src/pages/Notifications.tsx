import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../app/session'
import { useGlobal } from '../app/useGlobal'
import type { AppNotification } from '../domain/types'
import { Button, cx, Drawer, Empty } from '../ui/kit'

const when = (iso: string) => new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

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
      <button type="button" className="relative rounded-lg px-2 py-1.5 text-ink2 hover:bg-soft" onClick={() => setOpen(true)} aria-label={`Avisos${unread.length ? `: ${unread.length} sin leer` : ''}`}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread.length > 0 && <span className="absolute -top-0.5 -right-0.5 rounded-full bg-rojo px-1.5 text-[10px] font-bold text-white">{unread.length}</span>}
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
            <Empty>Sin avisos.</Empty>
          ) : (
            <ul className="space-y-2">
              {rows.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cx('w-full rounded-xl border px-4 py-3 text-left hover:border-accent-mid', n.readBy.includes(me) ? 'border-rule bg-white' : 'border-accent-mid bg-accent-soft/40')}
                    onClick={() =>
                      void read(n).then(() => {
                        setOpen(false)
                        if (n.link) navigate(n.link)
                      })
                    }
                  >
                    <div className="text-sm font-semibold">{n.title}</div>
                    {n.body && <div className="text-xs text-ink2">{n.body}</div>}
                    <div className="mt-1 text-[11px] text-muted">{when(n.createdAt)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Drawer>
      )}
    </>
  )
}
