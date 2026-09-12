import { describe, expect, it } from 'vitest';
import { nextOccurrence } from './recurrence';

describe('nextOccurrence', () => {
  it('unique nunca se repite', () => {
    expect(nextOccurrence('2026-01-05', 'unique', '2026-09-10')).toBeNull();
  });

  it('weekly: siguiente múltiplo de 7 días estrictamente después de hoy', () => {
    // original sábado 2026-01-03; hoy 2026-09-10 (jueves) -- el siguiente
    // sábado que cae en el ciclo semanal exacto es 2026-09-12
    expect(nextOccurrence('2026-01-03', 'weekly', '2026-09-10')).toBe('2026-09-12');
  });

  it('weekly: si hoy es exactamente el día de la ocurrencia, avanza al siguiente ciclo (estrictamente futuro)', () => {
    expect(nextOccurrence('2026-09-05', 'weekly', '2026-09-05')).toBe('2026-09-12');
  });

  it('biweekly: periodo de 14 días', () => {
    expect(nextOccurrence('2026-01-03', 'biweekly', '2026-09-10')).toBe('2026-09-12');
  });

  it('monthly: mismo día del mes, mes normal', () => {
    expect(nextOccurrence('2026-01-15', 'monthly', '2026-09-10')).toBe('2026-09-15');
  });

  it('monthly: día 31 se ajusta al último día de meses cortos (no salta a marzo)', () => {
    // originado el 31 de enero; febrero 2026 no es bisiesto -> 28
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-02-01')).toBe('2026-02-28');
  });

  it('yearly: mismo mes/día, un año después', () => {
    expect(nextOccurrence('2025-09-10', 'yearly', '2026-09-10')).toBe('2027-09-10');
  });

  it('la fecha resultante siempre es estrictamente posterior a hoy', () => {
    const today = '2026-09-10';
    for (const recurrence of ['weekly', 'biweekly', 'monthly', 'yearly'] as const) {
      const next = nextOccurrence('2020-03-15', recurrence, today);
      expect(next).not.toBeNull();
      expect(next! > today).toBe(true);
    }
  });
});
