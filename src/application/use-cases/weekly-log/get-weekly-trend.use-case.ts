import { ActivityLogDetail } from '../../../domain/entities/activity-log.entity';
import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { ProductivitySettingsRepository } from '../../../domain/repositories/productivity-settings.repository';
import { DEFAULT_PRODUCTIVITY_SETTINGS } from '../../../domain/entities/productivity-settings.entity';
import {
  addDaysUTC,
  formatDateOnly,
  formatRangeLabel,
  getWeekNumberForDate,
  getWeekStart,
  parseDateOnly,
  todayDateOnly,
} from '../../../shared/utils/week';

const WEEKS_PER_WINDOW = 4;

export interface WeeklyTrendWeek {
  weekNumber: number;
  year: number;
  rangeLabel: string;
  percent: number | null;
}

export interface CategoryTrendItem {
  categoryId: string;
  name: string;
  color: string;
  deltaHours: number;
}

export interface WeeklyTrend {
  currentWeeks: WeeklyTrendWeek[];
  previousWeeks: WeeklyTrendWeek[];
  currentAvgPercent: number | null;
  previousAvgPercent: number | null;
  deltaPercent: number | null;
  topImproved: CategoryTrendItem | null;
  topDeclined: CategoryTrendItem | null;
  summary: string | null;
}

// Tendencia mensual (4 semanas vs las 4 anteriores) para Registro Semanal --
// deliberadamente NO usa año/número de semana como Registro Semanal anual
// (get-weekly-log-year.use-case.ts), porque un mes rodante casi siempre
// cruza el límite de año calendario; todo se calcula con fechas reales
// (sábado a viernes, mismo criterio que el resto del proyecto) para evitar
// ese borde.
export class GetWeeklyTrendUseCase {
  constructor(
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly productivitySettingsRepository: ProductivitySettingsRepository,
  ) {}

  async execute(userId: string): Promise<WeeklyTrend> {
    const currentWeekStart = getWeekStart(parseDateOnly(todayDateOnly()));
    // 8 semanas: [-7..-4] = mes anterior, [-3..0] = mes actual (incluye la
    // semana en curso, igual que el resto de la app no distingue semanas
    // "completas" de parciales -- ver deltaVsPreviousWeek en
    // get-weekly-log-week.use-case.ts, mismo criterio).
    const rangeStart = addDaysUTC(currentWeekStart, -7 * (WEEKS_PER_WINDOW * 2 - 1));
    const rangeEnd = addDaysUTC(currentWeekStart, 6);

    const [logs, settings] = await Promise.all([
      this.activityLogRepository.findDetailedByUserAndDateRange(userId, formatDateOnly(rangeStart), formatDateOnly(rangeEnd)),
      this.productivitySettingsRepository.find(userId),
    ]);

    const weeklyTargetHours = settings?.weeklyTargetHours ?? DEFAULT_PRODUCTIVITY_SETTINGS.weeklyTargetHours;

    const weekStarts: Date[] = [];
    for (let i = WEEKS_PER_WINDOW * 2 - 1; i >= 0; i -= 1) {
      weekStarts.push(addDaysUTC(currentWeekStart, -7 * i));
    }

    const hoursByWeekIndex = new Map<number, number>();
    const hasLogsByWeekIndex = new Set<number>();
    const categoryHoursByWeekIndex = new Map<number, Map<string, { name: string; color: string; hours: number }>>();

    for (const log of logs) {
      const weekIndex = weekIndexForDate(log.logDate, weekStarts);
      if (weekIndex === -1) continue;
      hasLogsByWeekIndex.add(weekIndex);
      hoursByWeekIndex.set(weekIndex, (hoursByWeekIndex.get(weekIndex) ?? 0) + log.hours);

      const categoryMap = categoryHoursByWeekIndex.get(weekIndex) ?? new Map();
      const existing = categoryMap.get(log.categoryId);
      categoryMap.set(log.categoryId, {
        name: log.categoryName,
        color: log.categoryColor,
        hours: (existing?.hours ?? 0) + log.hours,
      });
      categoryHoursByWeekIndex.set(weekIndex, categoryMap);
    }

    const weeks: WeeklyTrendWeek[] = weekStarts.map((start, index) => {
      const { year, weekNumber } = getWeekNumberForDate(start);
      const rangeLabel = formatRangeLabel(start, addDaysUTC(start, 6));
      const percent = hasLogsByWeekIndex.has(index)
        ? weeklyTargetHours > 0
          ? Math.min(100, Math.round(((hoursByWeekIndex.get(index) ?? 0) / weeklyTargetHours) * 100))
          : 0
        : null;
      return { weekNumber, year, rangeLabel, percent };
    });

    const previousWeeks = weeks.slice(0, WEEKS_PER_WINDOW);
    const currentWeeks = weeks.slice(WEEKS_PER_WINDOW);

    const currentAvgPercent = averagePercent(currentWeeks);
    const previousAvgPercent = averagePercent(previousWeeks);
    const deltaPercent = currentAvgPercent !== null && previousAvgPercent !== null ? currentAvgPercent - previousAvgPercent : null;

    const currentCategoryHours = sumCategoryHours(categoryHoursByWeekIndex, WEEKS_PER_WINDOW, WEEKS_PER_WINDOW * 2 - 1);
    const previousCategoryHours = sumCategoryHours(categoryHoursByWeekIndex, 0, WEEKS_PER_WINDOW - 1);
    const { topImproved, topDeclined } = categoryDeltas(currentCategoryHours, previousCategoryHours);

    const summary = buildSummary(currentAvgPercent, previousAvgPercent, deltaPercent, currentWeeks, topImproved, topDeclined);

    return { currentWeeks, previousWeeks, currentAvgPercent, previousAvgPercent, deltaPercent, topImproved, topDeclined, summary };
  }
}

function weekIndexForDate(logDate: string, weekStarts: Date[]): number {
  const date = parseDateOnly(logDate);
  for (let i = weekStarts.length - 1; i >= 0; i -= 1) {
    if (date.getTime() >= weekStarts[i]!.getTime()) return i;
  }
  return -1;
}

function averagePercent(weeks: WeeklyTrendWeek[]): number | null {
  const withData = weeks.filter((w) => w.percent !== null);
  if (withData.length === 0) return null;
  const sum = withData.reduce((total, w) => total + (w.percent ?? 0), 0);
  return Math.round(sum / withData.length);
}

function sumCategoryHours(
  categoryHoursByWeekIndex: Map<number, Map<string, { name: string; color: string; hours: number }>>,
  fromIndex: number,
  toIndex: number,
): Map<string, { name: string; color: string; hours: number }> {
  const totals = new Map<string, { name: string; color: string; hours: number }>();
  for (let i = fromIndex; i <= toIndex; i += 1) {
    const weekMap = categoryHoursByWeekIndex.get(i);
    if (!weekMap) continue;
    for (const [categoryId, data] of weekMap.entries()) {
      const existing = totals.get(categoryId);
      totals.set(categoryId, { name: data.name, color: data.color, hours: (existing?.hours ?? 0) + data.hours });
    }
  }
  return totals;
}

function categoryDeltas(
  current: Map<string, { name: string; color: string; hours: number }>,
  previous: Map<string, { name: string; color: string; hours: number }>,
): { topImproved: CategoryTrendItem | null; topDeclined: CategoryTrendItem | null } {
  const categoryIds = new Set([...current.keys(), ...previous.keys()]);
  const deltas: CategoryTrendItem[] = Array.from(categoryIds).map((categoryId) => {
    const currentEntry = current.get(categoryId);
    const previousEntry = previous.get(categoryId);
    const entry = currentEntry ?? previousEntry!;
    const deltaHours = round1((currentEntry?.hours ?? 0) - (previousEntry?.hours ?? 0));
    return { categoryId, name: entry.name, color: entry.color, deltaHours };
  });

  const improved = deltas.filter((d) => d.deltaHours > 0).sort((a, b) => b.deltaHours - a.deltaHours);
  const declined = deltas.filter((d) => d.deltaHours < 0).sort((a, b) => a.deltaHours - b.deltaHours);

  return { topImproved: improved[0] ?? null, topDeclined: declined[0] ?? null };
}

function buildSummary(
  currentAvgPercent: number | null,
  previousAvgPercent: number | null,
  deltaPercent: number | null,
  currentWeeks: WeeklyTrendWeek[],
  topImproved: CategoryTrendItem | null,
  topDeclined: CategoryTrendItem | null,
): string | null {
  if (currentAvgPercent === null) return null;

  let headline: string;
  if (previousAvgPercent === null) {
    const weeksWithData = currentWeeks.filter((w) => w.percent !== null).length;
    const weekWord = weeksWithData === 1 ? 'semana' : 'semanas';
    headline = `Llevas ${weeksWithData} ${weekWord} con ${currentAvgPercent}% de productividad este mes. Necesitas el mes anterior completo para ver la tendencia.`;
  } else if (deltaPercent === 0) {
    headline = `Tu productividad se mantuvo igual este mes (${currentAvgPercent}%).`;
  } else if ((deltaPercent ?? 0) > 0) {
    headline = `Tu productividad subió ${deltaPercent} puntos este mes (${currentAvgPercent}% vs ${previousAvgPercent}% el mes pasado).`;
  } else {
    headline = `Tu productividad bajó ${Math.abs(deltaPercent ?? 0)} puntos este mes (${currentAvgPercent}% vs ${previousAvgPercent}% el mes pasado).`;
  }

  const categoryClause = buildCategoryClause(topImproved, topDeclined);
  return categoryClause ? `${headline} ${categoryClause}` : headline;
}

function buildCategoryClause(topImproved: CategoryTrendItem | null, topDeclined: CategoryTrendItem | null): string | null {
  if (topImproved && topDeclined) {
    return `Mejoraste más en ${topImproved.name} (+${topImproved.deltaHours}h) y bajaste más en ${topDeclined.name} (${topDeclined.deltaHours}h).`;
  }
  if (topImproved) {
    return `Mejoraste más en ${topImproved.name} (+${topImproved.deltaHours}h).`;
  }
  if (topDeclined) {
    return `Bajaste más en ${topDeclined.name} (${topDeclined.deltaHours}h).`;
  }
  return null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
