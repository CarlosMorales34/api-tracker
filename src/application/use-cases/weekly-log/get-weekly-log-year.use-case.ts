import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { ProductivitySettingsRepository } from '../../../domain/repositories/productivity-settings.repository';
import { DEFAULT_PRODUCTIVITY_SETTINGS } from '../../../domain/entities/productivity-settings.entity';
import { addDaysUTC, formatDateOnly, formatRangeLabel, getYearWeek1Start, parseDateOnly } from '../../../shared/utils/week';

const WEEKS_PER_YEAR = 52;

export interface WeeklyLogWeekSummary {
  weekNumber: number;
  year: number;
  rangeLabel: string;
  percent: number | null;
}

export interface CategoryDistributionItem {
  categoryId: string;
  name: string;
  color: string;
  hours: number;
  percent: number;
}

export interface WeeklyLogYearSummary {
  year: number;
  weeks: WeeklyLogWeekSummary[];
  annualPercent: number | null;
  weeksWithData: number;
  categoryDistribution: CategoryDistributionItem[];
}

export class GetWeeklyLogYearUseCase {
  constructor(
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly productivitySettingsRepository: ProductivitySettingsRepository,
  ) {}

  async execute(userId: string, year: number): Promise<WeeklyLogYearSummary> {
    const week1Start = getYearWeek1Start(year);
    const rangeEnd = addDaysUTC(week1Start, WEEKS_PER_YEAR * 7 - 1);

    const [logs, settings] = await Promise.all([
      this.activityLogRepository.findDetailedByUserAndDateRange(userId, formatDateOnly(week1Start), formatDateOnly(rangeEnd)),
      this.productivitySettingsRepository.find(userId),
    ]);

    const weeklyTargetHours = settings?.weeklyTargetHours ?? DEFAULT_PRODUCTIVITY_SETTINGS.weeklyTargetHours;

    const hoursByWeek = new Map<number, number>();
    const hasLogsByWeek = new Set<number>();
    const hoursByCategory = new Map<string, { name: string; color: string; hours: number }>();
    let totalHours = 0;

    for (const log of logs) {
      const weekIndex = Math.floor((parseDateOnly(log.logDate).getTime() - week1Start.getTime()) / (7 * 86400000)) + 1;
      hasLogsByWeek.add(weekIndex);
      hoursByWeek.set(weekIndex, (hoursByWeek.get(weekIndex) ?? 0) + log.hours);

      const existing = hoursByCategory.get(log.categoryId);
      hoursByCategory.set(log.categoryId, {
        name: log.categoryName,
        color: log.categoryColor,
        hours: (existing?.hours ?? 0) + log.hours,
      });
      totalHours += log.hours;
    }

    const weeks: WeeklyLogWeekSummary[] = [];
    let percentSum = 0;
    let weeksWithData = 0;

    for (let weekNumber = 1; weekNumber <= WEEKS_PER_YEAR; weekNumber += 1) {
      const start = addDaysUTC(week1Start, (weekNumber - 1) * 7);
      const end = addDaysUTC(start, 6);
      const rangeLabel = formatRangeLabel(start, end);

      let percent: number | null = null;
      if (hasLogsByWeek.has(weekNumber)) {
        const hours = hoursByWeek.get(weekNumber) ?? 0;
        percent = weeklyTargetHours > 0 ? Math.min(100, Math.round((hours / weeklyTargetHours) * 100)) : 0;
        percentSum += percent;
        weeksWithData += 1;
      }

      weeks.push({ weekNumber, year, rangeLabel, percent });
    }

    const categoryDistribution: CategoryDistributionItem[] = Array.from(hoursByCategory.entries()).map(
      ([categoryId, data]) => ({
        categoryId,
        name: data.name,
        color: data.color,
        hours: round2(data.hours),
        percent: totalHours > 0 ? Math.round((data.hours / totalHours) * 100) : 0,
      }),
    );

    return {
      year,
      weeks,
      annualPercent: weeksWithData > 0 ? Math.round(percentSum / weeksWithData) : null,
      weeksWithData,
      categoryDistribution,
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
