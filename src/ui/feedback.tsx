/**
 * Avisos breves (toasts) y confirmaciones con el diseño del software, en lugar de los
 * cuadros del navegador. `useToast()` avisa que algo se guardó o falló; `useConfirm()`
 * pregunta antes de borrar o de seguir con algo delicado y devuelve una promesa.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { Button, cx, IconBox, Modal } from './kit'

type ToastTone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  tone: ToastTone
  text: ReactNode
}
interface ConfirmOptions {
  title: ReactNode
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'warn' | 'default'
}
interface FeedbackApi {
  toast: (text: ReactNode, tone?: ToastTone) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const Ctx = createContext<FeedbackApi>({ toast: () => {}, confirm: async () => false })

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [ask, setAsk] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((xs) => xs.filter((t) => t.id !== id)), [])
  const toast = useCallback(
    (text: ReactNode, tone: ToastTone = 'success') => {
      const id = ++seq.current
      setToasts((xs) => [...xs.slice(-3), { id, tone, text }])
      window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 3500)
    },
    [dismiss],
  )
  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setAsk({ ...opts, resolve })), [])
  const api = useMemo(() => ({ toast, confirm }), [toast, confirm])

  const answer = (ok: boolean) => {
    ask?.resolve(ok)
    setAsk(null)
  }
  const tone = ask?.tone ?? 'default'

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex w-full max-w-sm animate-sube items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-pop',
              t.tone === 'success' && 'border-verde/30',
              t.tone === 'error' && 'border-rojo/30',
              t.tone === 'info' && 'border-accent-mid',
            )}
            role={t.tone === 'error' ? 'alert' : 'status'}
          >
            {t.tone === 'success' && <CircleCheck className="mt-0.5 size-4 shrink-0 text-verde" aria-hidden />}
            {t.tone === 'error' && <CircleAlert className="mt-0.5 size-4 shrink-0 text-rojo" aria-hidden />}
            {t.tone === 'info' && <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />}
            <div className="min-w-0 flex-1 text-ink">{t.text}</div>
            <button type="button" className="-mr-1 rounded p-0.5 text-muted hover:text-ink" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <Modal
        open={Boolean(ask)}
        title={ask?.title}
        onClose={() => answer(false)}
        icon={
          tone === 'default' ? undefined : (
            <IconBox tone={tone === 'danger' ? 'red' : 'amber'}>
              <TriangleAlert />
            </IconBox>
          )
        }
        footer={
          <>
            <Button onClick={() => answer(false)}>{ask?.cancelLabel ?? 'Cancelar'}</Button>
            <Button variant={tone === 'danger' ? 'destructive' : 'primary'} onClick={() => answer(true)} autoFocus>
              {ask?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        {ask?.body}
      </Modal>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx).toast
export const useConfirm = () => useContext(Ctx).confirm

/**
 * Pregunta antes de una acción delicada y la corre solo si se confirma. Por omisión es para
 * borrar: botón rojo «Borrar».
 */
export function useAsk() {
  const confirm = useConfirm()
  return (title: ReactNode, run: () => unknown, opts?: Partial<ConfirmOptions>) =>
    void confirm({ title, tone: 'danger', confirmLabel: 'Borrar', ...opts }).then((ok) => {
      if (ok) void run()
    })
}
