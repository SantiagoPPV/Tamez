import { useEffect, useId, useState, type ReactNode } from 'react'
import { cx } from './kit'

const inputCls =
  'h-10 w-full rounded-lg border border-rule bg-white px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none disabled:bg-soft disabled:text-muted sm:text-sm'

export function FieldShell({
  label,
  help,
  error,
  children,
  id,
  className,
}: {
  label: ReactNode
  help?: ReactNode
  error?: ReactNode
  children: ReactNode
  id: string
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-semibold text-rojo">{error}</p>
      ) : help ? (
        <p className="mt-1 text-xs text-muted">{help}</p>
      ) : null}
    </div>
  )
}

type Common = { label: ReactNode; help?: ReactNode; error?: ReactNode; disabled?: boolean; className?: string; required?: boolean }

export function TextField({ value, onChange, placeholder, list, ...c }: Common & { value: string; onChange: (v: string) => void; placeholder?: string; list?: string }) {
  const id = useId()
  return (
    <FieldShell id={id} {...c}>
      <input id={id} className={inputCls} value={value} placeholder={placeholder} list={list} disabled={c.disabled} required={c.required} onChange={(e) => onChange(e.target.value)} />
    </FieldShell>
  )
}

export function TextArea({ value, onChange, rows = 3, ...c }: Common & { value: string; onChange: (v: string) => void; rows?: number }) {
  const id = useId()
  return (
    <FieldShell id={id} {...c}>
      <textarea
        id={id}
        rows={rows}
        className={cx(inputCls, 'h-auto py-2 leading-snug')}
        value={value}
        disabled={c.disabled}
        required={c.required}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  )
}

/** Número con vacío permitido; acepta coma o punto decimal. */
export function NumberField({
  value,
  onChange,
  suffix,
  ...c
}: Common & { value: number | null; onChange: (v: number | null) => void; suffix?: string }) {
  const id = useId()
  const [text, setText] = useState(value == null ? '' : String(value))
  useEffect(() => {
    setText((t) => (Number(t.replace(',', '.')) === value ? t : value == null ? '' : String(value)))
  }, [value])
  return (
    <FieldShell id={id} {...c}>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          className={cx(inputCls, 'num', suffix && 'pr-12')}
          value={text}
          disabled={c.disabled}
          required={c.required}
          onChange={(e) => {
            const t = e.target.value
            setText(t)
            const clean = t.replace(',', '.').replace(/[$\s]/g, '')
            if (clean === '') onChange(null)
            else if (!Number.isNaN(Number(clean))) onChange(Number(clean))
          }}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{suffix}</span>}
      </div>
    </FieldShell>
  )
}

export function DateField({ value, onChange, ...c }: Common & { value: string | null; onChange: (v: string | null) => void }) {
  const id = useId()
  return (
    <FieldShell id={id} {...c}>
      <input
        id={id}
        type="date"
        className={cx(inputCls, 'num')}
        value={value ?? ''}
        min="2020-01-01"
        max="2099-12-31"
        disabled={c.disabled}
        required={c.required}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </FieldShell>
  )
}

export function SelectField<V extends string>({
  value,
  onChange,
  options,
  placeholder = '—',
  allowEmpty = true,
  ...c
}: Common & {
  value: V | null
  onChange: (v: V | null) => void
  options: { value: V; label: string }[]
  placeholder?: string
  allowEmpty?: boolean
}) {
  const id = useId()
  return (
    <FieldShell id={id} {...c}>
      <select
        id={id}
        className={inputCls}
        value={value ?? ''}
        disabled={c.disabled}
        required={c.required}
        onChange={(e) => onChange((e.target.value || null) as V | null)}
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2.5 text-sm leading-snug', disabled && 'cursor-not-allowed opacity-60')}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-accent"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
}

export function FormSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="mb-6">
      <legend className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{title}</legend>
      {children}
    </fieldset>
  )
}

/** Fecha y hora «AAAA-MM-DDTHH:MM» (hora local del centro de México). */
export function DateTimeField({ value, onChange, ...c }: Common & { value: string | null; onChange: (v: string | null) => void }) {
  const id = useId()
  return (
    <FieldShell id={id} {...c}>
      <input id={id} type="datetime-local" className={inputCls} value={value ?? ''} disabled={c.disabled} onChange={(e) => onChange(e.target.value || null)} />
    </FieldShell>
  )
}
