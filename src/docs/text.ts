/** Cómo escriben fechas, montos y cantidades las plantillas (GUIA.md y ejemplos CE-INV). */
import { toUTC, type ISODate } from '../domain/dates'
import { fmtMoney } from '../domain/format'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const parts = (d: ISODate) => {
  const t = new Date(toUTC(d))
  return { wd: t.getUTCDay(), day: t.getUTCDate(), m: t.getUTCMonth(), y: t.getUTCFullYear() }
}
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** «jueves 7 de enero de 2027» */
export function dLong(d: ISODate | null | undefined): string {
  if (!d) return ''
  const p = parts(d)
  return `${DAYS[p.wd]} ${p.day} de ${MONTHS[p.m]} de ${p.y}`
}
/** «Jueves 7 de enero de 2027» */
export const dLongCap = (d: ISODate | null | undefined) => cap(dLong(d))
/** «jueves 7 de enero» */
export function dLongNoYear(d: ISODate | null | undefined): string {
  if (!d) return ''
  const p = parts(d)
  return `${DAYS[p.wd]} ${p.day} de ${MONTHS[p.m]}`
}
/** «7 de enero de 2027» */
export function dDate(d: ISODate | null | undefined): string {
  if (!d) return ''
  const p = parts(d)
  return `${p.day} de ${MONTHS[p.m]} de ${p.y}`
}
/** «12 feb 2027» */
export function dShort(d: ISODate | null | undefined): string {
  if (!d) return ''
  const p = parts(d)
  return `${p.day} ${MONTHS_SHORT[p.m]} ${p.y}`
}
/** «vie 12 feb 2027» */
export function dShortDay(d: ISODate | null | undefined): string {
  if (!d) return ''
  const p = parts(d)
  return `${DAYS_SHORT[p.wd]} ${p.day} ${MONTHS_SHORT[p.m]} ${p.y}`
}
/** «Vie 12 feb» */
export function dDayMonth(d: ISODate | null | undefined): string {
  if (!d) return ''
  const p = parts(d)
  return `${cap(DAYS_SHORT[p.wd])} ${p.day} ${MONTHS_SHORT[p.m]}`
}
/** «12 feb» */
export function dShortNoYear(d: ISODate | null | undefined): string {
  if (!d) return ''
  const p = parts(d)
  return `${p.day} ${MONTHS_SHORT[p.m]}`
}
/** «mayo de 2027» */
export function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} de ${y}`
}
export const monthOnly = (month: string) => MONTHS[Number(month.split('-')[1]) - 1]

export const money = (x: number | null | undefined) => (x == null ? '' : fmtMoney(x))
/** «330,000 pesos» */
export const moneyWords = (x: number | null | undefined) => (x == null ? '' : `${fmtMoney(x).replace('$', '')} pesos`)
export const pct = (x: number | null | undefined, decimals = 0) =>
  x == null ? '' : `${(Math.round(x * 100 * 10 ** decimals) / 10 ** decimals).toLocaleString('es-MX')} %`
export const hours = (x: number | null | undefined) =>
  x == null ? '' : (Math.round(x * 10) / 10).toLocaleString('es-MX', { maximumFractionDigits: 1 })

const UNITS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte']
/** «cuatro» (hasta veinte; después, la cifra) */
export const words = (n: number) => (Number.isInteger(n) && n >= 0 && n <= 20 ? UNITS[n] : String(n))

/** «5, 8 y 11» */
export function joinY(items: (string | number)[]): string {
  const xs = items.map(String).filter(Boolean)
  if (xs.length <= 1) return xs.join('')
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`
}
