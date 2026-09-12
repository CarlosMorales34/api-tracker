import { MoneyEntryRecurrence } from '../../domain/entities/money-entry.entity';
import { addDaysUTC, formatDateOnly, parseDateOnly } from './week';

// Suma `months` a una fecha UTC, ajustando al último día del mes destino si
// el día original no existe ahí (ej. 31 de enero + 1 mes = 28/29 de
// febrero, no 3 de marzo) -- mismo criterio que clampToMonthEnd en
// get-finance-week-summary.use-case.ts.
function addMonthsUTC(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfTargetMonth)));
}

// Próxima fecha, estrictamente después de `todayIso`, en la que un ingreso
// recurrente creado en `originalDateIso` volvería a ocurrir -- null para
// 'unique' (no se repite). Puramente informativo (no genera filas nuevas).
export function nextOccurrence(originalDateIso: string, recurrence: MoneyEntryRecurrence, todayIso: string): string | null {
  if (recurrence === 'unique') return null;

  const today = parseDateOnly(todayIso);
  let next = parseDateOnly(originalDateIso);

  if (recurrence === 'weekly' || recurrence === 'biweekly') {
    const periodDays = recurrence === 'weekly' ? 7 : 14;
    while (next.getTime() <= today.getTime()) next = addDaysUTC(next, periodDays);
  } else {
    const periodMonths = recurrence === 'monthly' ? 1 : 12;
    while (next.getTime() <= today.getTime()) next = addMonthsUTC(next, periodMonths);
  }

  return formatDateOnly(next);
}
