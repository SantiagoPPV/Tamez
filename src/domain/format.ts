import type { ISODate } from './dates'

/** Formatos de la hoja: $#,##0 · dd/mm/aaaa · horas con un decimal · índices 0.00 · 0.0 %. */
const intFmt = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })
const oneDec = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const twoDec = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** ROUND de Excel: mitades lejos de cero. */
export function roundExcel(x: number, decimals = 0): number {
  const f = 10 ** decimals
  const scaled = Math.abs(x) * f
  // Corrige errores binarios (p. ej. 1.005 * 100 = 100.49999…)
  const r = Math.round(scaled + 1e-9 * Math.max(1, scaled))
  return (Math.sign(x) * r) / f
}

export function fmtMoney(x: number | null | undefined): string {
  if (x == null || Number.isNaN(x)) return ''
  const s = intFmt.format(Math.abs(roundExcel(x)))
  return (x < 0 && roundExcel(x) !== 0 ? '-$' : '$') + s
}

export function fmtHours(x: number | null | undefined): string {
  if (x == null || Number.isNaN(x)) return ''
  return oneDec.format(roundExcel(x, 1))
}

export function fmtInt(x: number | null | undefined): string {
  if (x == null || Number.isNaN(x)) return ''
  return intFmt.format(roundExcel(x))
}

export function fmtIndex(x: number | null | undefined): string {
  if (x == null || Number.isNaN(x)) return ''
  return twoDec.format(roundExcel(x, 2))
}

export function fmtPct(x: number | null | undefined): string {
  if (x == null || Number.isNaN(x)) return ''
  return `${oneDec.format(roundExcel(x * 100, 1))} %`
}

export function fmtDate(d: ISODate | null | undefined): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

export const folio = {
  workLog: (seq: number) => `T-${pad(seq, 3)}`,
  decision: (seq: number) => `DE-${pad(seq, 2)}`,
  change: (seq: number) => `C-${pad(seq, 2)}`,
  risk: (seq: number) => `R-${pad(seq, 2)}`,
}
