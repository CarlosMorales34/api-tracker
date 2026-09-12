import { describe, expect, it } from 'vitest';
import {
  addDaysUTC,
  formatDateOnly,
  getWeekNumberForDate,
  getWeekRange,
  getWeekRangeForNumber,
  getWeekStart,
  getYearWeek1Start,
  isValidDateOnly,
  parseDateOnly,
} from './week';

describe('week.ts', () => {
  it('getWeekStart siempre devuelve un sábado (0=domingo..6=sábado, sábado=6)', () => {
    // 2026-09-10 es jueves
    const thursday = parseDateOnly('2026-09-10');
    const start = getWeekStart(thursday);
    expect(start.getUTCDay()).toBe(6);
    expect(formatDateOnly(start)).toBe('2026-09-05');
  });

  it('getWeekStart de un sábado se devuelve a sí mismo', () => {
    const saturday = parseDateOnly('2026-09-05');
    expect(formatDateOnly(getWeekStart(saturday))).toBe('2026-09-05');
  });

  it('getWeekRange devuelve sábado a viernes (6 días después)', () => {
    const { start, end } = getWeekRange(parseDateOnly('2026-09-10'));
    expect(formatDateOnly(start)).toBe('2026-09-05');
    expect(formatDateOnly(end)).toBe('2026-09-11');
    expect(end.getUTCDay()).toBe(5); // viernes
  });

  it('getYearWeek1Start = sábado on/before el 1 de enero', () => {
    // 2026-01-01 es jueves -> semana 1 empieza el sábado anterior, 2025-12-27
    expect(formatDateOnly(getYearWeek1Start(2026))).toBe('2025-12-27');
  });

  it('getWeekNumberForDate y getWeekRangeForNumber son inversas entre sí', () => {
    const date = parseDateOnly('2026-09-10');
    const { year, weekNumber } = getWeekNumberForDate(date);
    const range = getWeekRangeForNumber(year, weekNumber);
    expect(formatDateOnly(range.start)).toBe(formatDateOnly(getWeekStart(date)));
  });

  it('getWeekNumberForDate: el año de la semana es el de su sábado de inicio, no el de la fecha', () => {
    // 2025-12-29 cae en la semana que empieza el sábado 2025-12-27 -- esa
    // semana pertenece a 2025 (year = año del weekStart), es la última
    // semana (53) del año, no la primera de 2026.
    const { year, weekNumber } = getWeekNumberForDate(parseDateOnly('2025-12-29'));
    expect(year).toBe(2025);
    expect(weekNumber).toBe(53);
  });

  it('addDaysUTC no se ve afectado por límites de mes/año', () => {
    expect(formatDateOnly(addDaysUTC(parseDateOnly('2025-12-30'), 5))).toBe('2026-01-04');
  });

  it('isValidDateOnly rechaza fechas de calendario inexistentes', () => {
    expect(isValidDateOnly('2026-02-30')).toBe(false);
    expect(isValidDateOnly('2026-09-10')).toBe(true);
    expect(isValidDateOnly('not-a-date')).toBe(false);
  });
});
