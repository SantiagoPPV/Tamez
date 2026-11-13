import { useEffect, useId, useState, type ReactNode } from 'react'
import { cx } from './kit'

const inputCls =
  'h-10 w-full rounded-lg border border-rule bg-white px-3 text-[15px] text-ink shadow-[0_1px_1px_rgb(15_23_42/0.03)] transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-accent-mid focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/15 disabled:bg-soft disabled:text-muted sm:text-sm'

/** Para un campo hecho a mano con la misma apariencia. */
export const fieldClass = inputCls

export function FieldShell({
  label,
  help,
  error,
  children,
  id,
  className,
  required,
}: {
  label: ReactNode
  help?: ReactNode
  error?: ReactNode
  children: ReactNode
  id: string
  className?: string
  required?: boolean
}) {
  return (
    <div className={className}>
      {label !== '' && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink2">
          {label}
          {required && (
            <span className="ml-0.5 text-rojo" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
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
        className="mt-0.5 size-4 shrink-0 rounded accent-accent"
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
    <fieldset className="mb-6 rounded-xl border border-rule bg-white p-4 shadow-card sm:p-5">
      <legend className="-ml-1 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{title}</legend>
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

/** Archivo elegido con un clic directo (sin selectores encadenados), con su nombre a la vista. */
export function FileField({
  label,
  accept,
  file,
  onChange,
  help,
  required,
  className,
}: {
  label: ReactNode
  accept: string
  file: File | null
  onChange: (f: File | null) => void
  help?: ReactNode
  required?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} help={help} required={required} className={className}>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-rule bg-surface px-3 py-2">
        <input key={file ? 'con' : 'sin'} id={id} type="file" accept={accept} className="peer sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        <label
          htmlFor={id}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-lg border border-rule bg-white px-3 text-[13px] font-semibold text-ink shadow-sm hover:border-accent-mid peer-focus-visible:outline-2 peer-focus-visible:outline-accent"
        >
          {file ? 'Cambiar' : 'Elegir archivo'}
        </label>
        <span className={cx('min-w-0 flex-1 truncate text-sm', file ? 'font-medium text-ink' : 'text-muted')}>{file ? file.name : 'Ningún archivo elegido'}</span>
        {file && (
          <button type="button" className="shrink-0 rounded px-1.5 text-sm text-muted hover:text-rojo" onClick={() => onChange(null)} aria-label="Quitar el archivo">
            ✕
          </button>
        )}
      </div>
    </FieldShell>
  )
}
