import { describe, expect, it } from 'vitest'
import { BusinessCalendar, todayInMexico } from './dates'
import { fmtDate, fmtHours, fmtIndex, fmtMoney, fmtPct, roundExcel } from './format'

const cal = new BusinessCalendar(['2027-02-01', '2027-03-15'])

describe('Días hábiles (WORKDAY y NETWORKDAYS)', () => {
  it('cuenta de lunes a viernes sin inhábiles, ambos extremos incluidos', () => {
    expect(cal.networkDays('2027-01-29', '2027-02-02')).toBe(2) // viernes, (lunes inhábil), martes
    expect(cal.networkDays('2027-02-12', '2027-02-12')).toBe(1)
    expect(cal.networkDays('2027-02-23', '2027-02-12')).toBe(-8)
  })
  it('suma días hábiles saltando fines de semana e inhábiles', () => {
    expect(cal.workday('2027-02-12', 7)).toBe('2027-02-23')
    expect(cal.workday('2027-03-05', 3)).toBe('2027-03-10')
    expect(cal.workday('2027-03-12', 1)).toBe('2027-03-16') // el lunes 15/03 es inhábil
    expect(cal.workday('2027-02-13', 0)).toBe('2027-02-13')
  })
  it('desviación: positiva tarde, negativa antes, cero en la fecha', () => {
    expect(cal.deviation('2027-02-12', '2027-02-12')).toBe(0)
    expect(cal.deviation('2027-02-12', '2027-02-15')).toBe(1)
    expect(cal.deviation('2027-02-12', '2027-02-11')).toBe(-1)
  })
  it('hoy en la hora del centro de México', () => {
    expect(todayInMexico(new Date('2027-02-13T05:30:00Z'))).toBe('2027-02-12')
  })
})

describe('Formatos de la hoja', () => {
  it('redondea como Excel', () => {
    expect(roundExcel(179 / 199, 2)).toBe(0.9)
    expect(roundExcel(2.5)).toBe(3)
    expect(roundExcel(-2.5)).toBe(-3)
    expect(roundExcel(1.005, 2)).toBe(1.01)
  })
  it('$#,##0 · dd/mm/aaaa · 0.0 · 0.00 · 0.0 %', () => {
    expect(fmtMoney(276500)).toBe('$276,500')
    expect(fmtMoney(-1000)).toBe('-$1,000')
    expect(fmtDate('2027-02-12')).toBe('12/02/2027')
    expect(fmtHours(184.5)).toBe('184.5')
    expect(fmtHours(199)).toBe('199.0')
    expect(fmtIndex(0.9)).toBe('0.90')
    expect(fmtPct(0.13636)).toBe('13.6 %')
  })
})
