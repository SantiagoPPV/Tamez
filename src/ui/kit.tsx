import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LIGHT } from '../domain/catalogs'
import type { Light } from '../domain/types'

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' }
export function Button({ variant = 'secondary', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-accent text-white hover:bg-accent-2',
        variant === 'secondary' && 'border border-rule bg-white text-ink hover:bg-soft',
        variant === 'ghost' && 'text-ink2 hover:bg-soft',
        variant === 'danger' && 'border border-rojo/30 bg-white text-rojo hover:bg-rojo-soft',
        className,
      )}
    />
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-xl border border-rule bg-white', className)}>{children}</div>
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-base font-bold tracking-tight">{children}</h2>
      {aside}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{children}</div>
}

const LIGHT_STYLE: Record<Light, string> = {
  green: 'bg-accent-soft text-accent-2',
  yellow: 'bg-ambar-soft text-ambar',
  red: 'bg-rojo-soft text-rojo',
  none: 'bg-soft text-muted',
}
const DOT: Record<Light, string> = {
  green: 'bg-accent',
  yellow: 'bg-ambar',
  red: 'bg-rojo',
  none: 'bg-muted/40',
}

export function LightBadge({ light, size = 'md' }: { light: Light; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        LIGHT_STYLE[light],
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-0.5 text-sm',
        size === 'lg' && 'px-3.5 py-1.5 text-base',
      )}
    >
      <span className={cx('inline-block rounded-full', DOT[light], size === 'lg' ? 'size-2.5' : 'size-2')} />
      {LIGHT[light]}
    </span>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  if (!children) return null
  return <span className="text-xs font-semibold text-rojo">{children}</span>
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'rounded-lg border px-4 py-3 text-sm',
        tone === 'info' && 'border-accent-mid bg-accent-soft text-accent-2',
        tone === 'warn' && 'border-ambar/30 bg-ambar-soft text-ambar',
        tone === 'error' && 'border-rojo/30 bg-rojo-soft text-rojo',
      )}
    >
      {children}
    </div>
  )
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-accent-mid border-t-accent" />
      {label}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-rule bg-white px-4 py-10 text-center text-sm text-muted">{children}</div>
}

/** Panel lateral (pantalla completa en celular) para capturar o editar un renglón. */
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-rule px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{title}</h2>
            {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            ✕
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {footer && <div className="border-t border-rule bg-surface px-4 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>
  )
}

/** Tabla en computadora y tarjetas en celular, sin desplazamiento lateral de la página. */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  card,
  empty = 'Sin renglones.',
  rowClassName,
}: {
  rows: T[]
  columns: { label: ReactNode; render: (row: T) => ReactNode; className?: string; headClassName?: string }[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  card: (row: T) => ReactNode
  empty?: ReactNode
  rowClassName?: (row: T) => string | undefined
}) {
  if (!rows.length) return <Empty>{empty}</Empty>
  return (
    <>
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)}>
            <button
              type="button"
              className="w-full rounded-xl border border-rule bg-white px-4 py-3 text-left hover:border-accent-mid"
              onClick={() => onRowClick?.(r)}
              disabled={!onRowClick}
            >
              {card(r)}
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border border-rule bg-white md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
              {columns.map((c, i) => (
                <th key={i} className={cx('px-3 py-2.5 align-bottom', c.headClassName)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                className={cx(
                  'border-b border-rule last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-accent-soft/40',
                  rowClassName?.(r),
                )}
                onClick={() => onRowClick?.(r)}
              >
                {columns.map((c, i) => (
                  <td key={i} className={cx('px-3 py-2 align-top', c.className)}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="num text-lg font-bold">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  )
}
