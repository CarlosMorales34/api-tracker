// Semana = sábado a viernes en todo el proyecto (Finanzas, Gastos diarios,
// Registro semanal). Todas las fechas se manejan en UTC-de-calendario (sin
// hora) para evitar que el timezone del proceso Node desplace el día — los
// valores vienen y van como `YYYY-MM-DD` puro.

const MONTH_ABBR_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, (month ?? 1) - 1, day ?? 1));
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Sábado on/before `date`. getUTCDay(): 0=Dom..6=Sáb.
export function getWeekStart(date: Date): Date {
  const day = date.getUTCDay();
  const daysSinceSaturday = (day + 1) % 7;
  return addDaysUTC(date, -daysSinceSaturday);
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = getWeekStart(date);
  return { start, end: addDaysUTC(start, 6) };
}

// Semana 1 del año = la que contiene el primer sábado on/before el 1 de enero.
export function getYearWeek1Start(year: number): Date {
  return getWeekStart(new Date(Date.UTC(year, 0, 1)));
}

export function getWeekRangeForNumber(year: number, weekNumber: number): { start: Date; end: Date } {
  const week1Start = getYearWeek1Start(year);
  const start = addDaysUTC(week1Start, (weekNumber - 1) * 7);
  return { start, end: addDaysUTC(start, 6) };
}

// Semana + año de una fecha cualquiera (usa el año del sábado de esa semana
// como año de referencia, mismo criterio que el resto del proyecto).
export function getWeekNumberForDate(date: Date): { year: number; weekNumber: number } {
  const weekStart = getWeekStart(date);
  const year = weekStart.getUTCFullYear();
  const week1Start = getYearWeek1Start(year);
  const diffDays = Math.round((weekStart.getTime() - week1Start.getTime()) / 86400000);
  return { year, weekNumber: Math.floor(diffDays / 7) + 1 };
}

export function formatRangeLabel(start: Date, end: Date): string {
  return `${start.getUTCDate()} – ${end.getUTCDate()} ${MONTH_ABBR_ES[end.getUTCMonth()]}`;
}

// "Hoy" tal como lo vive el usuario (timezone local del proceso), no el día
// UTC — `new Date()` es un instante, no una fecha de calendario, así que
// formatDateOnly(new Date()) puede desfasarse un día según el TZ del server.
export function todayDateOnly(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateOnly(value);
  return formatDateOnly(date) === value;
}
