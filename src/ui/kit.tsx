import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, CircleAlert, CircleCheck, Inbox, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { LIGHT } from '../domain/catalogs'
import type { Light } from '../domain/types'

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

/* ------------------------------------------------------------------ botones ---- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

function buttonClass(variant: Variant, size: Size, className?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0',
    size === 'sm' ? 'h-8 px-3 text-[13px] [&_svg]:size-3.5' : size === 'lg' ? 'h-11 px-5 text-[15px] [&_svg]:size-[18px]' : 'h-10 px-4 text-sm [&_svg]:size-4',
    variant === 'primary' && 'bg-accent text-white shadow-sm hover:bg-accent-2 active:bg-navy',
    variant === 'secondary' && 'border border-rule bg-white text-ink shadow-sm hover:border-accent-mid hover:bg-accent-soft/50',
    variant === 'ghost' && 'text-ink2 hover:bg-soft hover:text-ink',
    variant === 'subtle' && 'bg-accent-soft text-accent-2 hover:bg-accent-mid/50',
    variant === 'danger' && 'border border-rojo/30 bg-white text-rojo hover:bg-rojo-soft',
    variant === 'destructive' && 'bg-rojo text-white shadow-sm hover:bg-rojo/90',
    className,
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode; loading?: boolean }
export function Button({ variant = 'secondary', size = 'md', icon, loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button type="button" {...rest} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)}>
      {loading ? <LoaderCircle className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

/** Liga con forma de botón (navegación dentro del software). */
export function LinkButton({ to, variant = 'secondary', size = 'md', icon, className, children }: { to: string; variant?: Variant; size?: Size; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  )
}

/* ------------------------------------------------------------- contenedores ---- */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-xl border border-rule bg-white shadow-card', className)}>{children}</div>
}

/** Encabezado de una tarjeta: ícono, título, subtítulo y acciones. */
export function CardHeader({ title, subtitle, icon, actions, className }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 border-b border-rule px-4 py-3.5 sm:px-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <IconBox>{icon}</IconBox>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold tracking-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function IconBox({ children, tone = 'navy', size = 'md' }: { children: ReactNode; tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cx(
        'grid shrink-0 place-items-center rounded-lg',
        size === 'sm' ? 'size-7 [&_svg]:size-3.5' : size === 'lg' ? 'size-11 [&_svg]:size-5' : 'size-9 [&_svg]:size-[18px]',
        ICON_TONE[tone],
      )}
    >
      {children}
    </span>
  )
}

/** Encabezado de página: regreso, antetítulo, título, descripción, datos clave y acciones. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  back,
  meta,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  meta?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-2">
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px] sm:leading-tight">{title}</h1>
          {subtitle && <div className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-ink2">{subtitle}</div>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

export function SectionTitle({ children, aside, subtitle, icon }: { children: ReactNode; aside?: ReactNode; subtitle?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <IconBox size="sm">{icon}</IconBox>}
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-ink">{children}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {aside}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{children}</div>
}

/* ------------------------------------------------------------------ estados ---- */

export type Tone = 'navy' | 'green' | 'amber' | 'red' | 'gray' | 'solid'
const BADGE: Record<Tone, string> = {
  navy: 'bg-accent-soft text-accent-2 ring-accent-mid/70',
  green: 'bg-verde-soft text-verde ring-verde/20',
  amber: 'bg-ambar-soft text-ambar ring-ambar/25',
  red: 'bg-rojo-soft text-rojo ring-rojo/20',
  gray: 'bg-soft text-ink2 ring-rule',
  solid: 'bg-accent text-white ring-accent',
}
const ICON_TONE: Record<Tone, string> = {
  navy: 'bg-accent-soft text-accent',
  green: 'bg-verde-soft text-verde',
  amber: 'bg-ambar-soft text-ambar',
  red: 'bg-rojo-soft text-rojo',
  gray: 'bg-soft text-ink2',
  solid: 'bg-accent text-white',
}

export function Badge({ tone = 'gray', dot, icon, children, className }: { tone?: Tone; dot?: boolean; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset [&_svg]:size-3.5', BADGE[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {icon}
      {children}
    </span>
  )
}

const LIGHT_TONE: Record<Light, Tone> = { green: 'green', yellow: 'amber', red: 'red', none: 'gray' }

export function LightBadge({ light, size = 'md' }: { light: Light; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Badge tone={LIGHT_TONE[light]} dot className={cx(size === 'md' && 'text-sm', size === 'lg' && 'px-3.5 py-1.5 text-base')}>
      {LIGHT[light]}
    </Badge>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  if (!children) return null
  return <span className="text-xs font-semibold text-rojo">{children}</span>
}

const NOTICE = {
  info: { cls: 'border-accent-mid bg-accent-soft text-accent-2', Icon: Info },
  success: { cls: 'border-verde/25 bg-verde-soft text-verde', Icon: CircleCheck },
  warn: { cls: 'border-ambar/30 bg-ambar-soft text-ambar', Icon: TriangleAlert },
  error: { cls: 'border-rojo/30 bg-rojo-soft text-rojo', Icon: CircleAlert },
}

export function Notice({ tone = 'info', title, children, action }: { tone?: keyof typeof NOTICE; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const { cls, Icon } = NOTICE[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', cls)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted" role="status">
      <LoaderCircle className="size-5 animate-spin text-accent" aria-hidden />
      {label}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-soft', className)} aria-hidden />
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-rule bg-white px-4 py-10 text-center text-sm text-muted">{children}</div>
}

/** Estado vacío con ícono, título, explicación y la acción para empezar. */
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-rule bg-white px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-6" aria-hidden>
        {icon ?? <Inbox />}
      </span>
      <h3 className="mt-3 text-base font-bold text-ink">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

const BAR: Record<Tone, string> = { navy: 'bg-accent', green: 'bg-verde', amber: 'bg-ambar', red: 'bg-rojo', gray: 'bg-muted', solid: 'bg-navy' }

export function ProgressBar({ value, max = 1, tone = 'navy', label, size = 'md' }: { value: number; max?: number; tone?: Tone; label?: string; size?: 'sm' | 'md' }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  return (
    <div
      className={cx('w-full overflow-hidden rounded-full bg-soft', size === 'sm' ? 'h-1.5' : 'h-2')}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-500', BAR[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Avatar({ name, size = 'md', tone = 'solid' }: { name: string | null | undefined; size?: 'sm' | 'md'; tone?: 'solid' | 'soft' | 'white' }) {
  const initials =
    (name ?? '')
      .replace(/[(),.]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 || /[A-ZÁÉÍÓÚÑ]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={cx(
        'grid shrink-0 place-items-center rounded-full font-bold',
        size === 'sm' ? 'size-7 text-[11px]' : 'size-9 text-xs',
        tone === 'solid' && 'bg-accent text-white',
        tone === 'soft' && 'bg-accent-soft text-accent-2',
        tone === 'white' && 'bg-white text-navy',
      )}
    >
      {initials}
    </span>
  )
}

/* ----------------------------------------------------------- indicadores ---- */

/** Indicador en tarjeta: etiqueta, valor, explicación e ícono. */
export function KpiCard({ label, value, hint, icon, tone = 'navy', alert }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: Tone; alert?: boolean }) {
  return (
    <Card className={cx('p-4', alert && 'border-rojo/30')}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] font-semibold text-muted">{label}</div>
        {icon && (
          <IconBox tone={tone} size="sm">
            {icon}
          </IconBox>
        )}
      </div>
      <div className={cx('num mt-1.5 text-2xl font-bold tracking-tight', alert ? 'text-rojo' : 'text-ink')}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  )
}

export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="num text-lg font-bold text-ink">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  )
}

/** Selector de una opción entre pocas (filtros), con conteo opcional. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: ReactNode; count?: number }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div role="group" aria-label={label} className={cx('scroll-fino inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-rule bg-white p-1 shadow-card', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors', on ? 'bg-accent text-white shadow-sm' : 'text-ink2 hover:bg-soft')}
          >
            {o.label}
            {o.count != null && <span className={cx('num rounded-full px-1.5 text-xs', on ? 'bg-white/20 text-white' : 'bg-soft text-muted')}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------- paneles y diálogos ---- */

function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const before = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      before?.focus?.()
    }
  }, [open, onClose])
  return ref
}

/** Panel lateral (pantalla completa en celular) para capturar o editar un renglón. */
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const ref = useModal(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-entra bg-navy/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cx('relative flex h-full w-full animate-entra flex-col bg-white shadow-pop outline-none', wide ? 'max-w-3xl' : 'max-w-xl')}
      >
        <div className="flex items-start justify-between gap-3 border-b border-rule px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar" className="-mr-2 px-2">
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-rule bg-surface px-4 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>
  )
}

/** Diálogo centrado (confirmaciones y avisos breves). */
export function Modal({ open, title, onClose, children, footer, icon }: { open: boolean; title: ReactNode; onClose: () => void; children?: ReactNode; footer?: ReactNode; icon?: ReactNode }) {
  const ref = useModal(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-entra bg-navy/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" className="relative w-full max-w-md animate-sube rounded-t-2xl bg-white p-5 shadow-pop outline-none sm:rounded-2xl">
        <div className="flex items-start gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight">{title}</h2>
            {children && <div className="mt-1.5 text-sm text-ink2">{children}</div>}
          </div>
        </div>
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- tablas ---- */

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
              className="w-full rounded-xl border border-rule bg-white px-4 py-3 text-left shadow-card transition-colors hover:border-accent-mid disabled:cursor-default"
              onClick={() => onRowClick?.(r)}
              disabled={!onRowClick}
            >
              {card(r)}
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border border-rule bg-white shadow-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-muted">
              {columns.map((c, i) => (
                <th key={i} className={cx('px-4 py-3 align-bottom', c.headClassName)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                className={cx('border-b border-rule transition-colors last:border-0', onRowClick && 'cursor-pointer hover:bg-accent-soft/50', rowClassName?.(r))}
                onClick={() => onRowClick?.(r)}
              >
                {columns.map((c, i) => (
                  <td key={i} className={cx('px-4 py-2.5 align-top', c.className)}>
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
