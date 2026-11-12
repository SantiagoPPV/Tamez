/**
 * Fechas como texto ISO «AAAA-MM-DD» (sin hora). Se comparan como texto.
 * Días hábiles: lunes a viernes, sin los días inhábiles del proyecto.
 * Replica WORKDAY y NETWORKDAYS de la hoja de control.
 */
export type ISODate = string

const DAY_MS = 86_400_000

export function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

export function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * DAY_MS)
}

/** Días naturales de a a b (b − a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS)
}

export function maxDate(...ds: (ISODate | null | undefined)[]): ISODate | null {
  let best: ISODate | null = null
  for (const d of ds) if (d && (best === null || d > best)) best = d
  return best
}

export function minDate(...ds: (ISODate | null | undefined)[]): ISODate | null {
  let best: ISODate | null = null
  for (const d of ds) if (d && (best === null || d < best)) best = d
  return best
}

export function isWeekend(d: ISODate): boolean {
  const wd = new Date(toUTC(d)).getUTCDay()
  return wd === 0 || wd === 6
}

export class BusinessCalendar {
  private readonly holidays: Set<ISODate>

  constructor(nonWorkingDays: readonly ISODate[]) {
    this.holidays = new Set(nonWorkingDays)
  }

  isBusinessDay(d: ISODate): boolean {
    return !isWeekend(d) && !this.holidays.has(d)
  }

  /** NETWORKDAYS(a, b): días hábiles de a a b, ambos incluidos; negativo si b < a. */
  networkDays(a: ISODate, b: ISODate): number {
    if (a > b) return -this.networkDays(b, a)
    let count = 0
    for (let ms = toUTC(a), end = toUTC(b); ms <= end; ms += DAY_MS) {
      if (this.isBusinessDay(fromUTC(ms))) count++
    }
    return count
  }

  /** WORKDAY(start, n): n días hábiles después de start (n = 0 devuelve start). */
  workday(start: ISODate, n: number): ISODate {
    let d = start
    let left = Math.abs(Math.trunc(n))
    const step = n < 0 ? -1 : 1
    while (left > 0) {
      d = addDays(d, step)
      if (this.isBusinessDay(d)) left--
    }
    return d
  }

  /**
   * Desviación en días hábiles de `actual` contra `planned`, como la hoja:
   * positiva si va tarde (sin contar el día planeado), negativa si va antes.
   */
  deviation(planned: ISODate, actual: ISODate): number {
    return actual >= planned
      ? this.networkDays(planned, actual) - 1
      : 1 - this.networkDays(actual, planned)
  }
}

/** Hoy en la hora del centro de México. */
export function todayInMexico(now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** «dd/mm/aaaa» → ISO. Devuelve null si está vacío o no es válido. */
export function parseDMY(text: string | null | undefined): ISODate | null {
  if (!text) return null
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim())
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}
