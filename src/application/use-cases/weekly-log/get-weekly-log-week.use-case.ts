import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { ProductivitySettingsRepository } from '../../../domain/repositories/productivity-settings.repository';
import { WeekNoteRepository } from '../../../domain/repositories/week-note.repository';
import { DEFAULT_PRODUCTIVITY_SETTINGS } from '../../../domain/entities/productivity-settings.entity';
import { ActivityLogDetail } from '../../../domain/entities/activity-log.entity';
import { formatDateOnly, formatRangeLabel, getWeekRangeForNumber } from '../../../shared/utils/week';

export interface CategoryHoursItem {
  categoryId: string;
  name: string;
  color: string;
  hours: number;
}

export interface TopActivityItem {
  name: string;
  hours: number;
}

export interface WeeklyLogWeekDetail {
  weekNumber: number;
  year: number;
  rangeLabel: string;
  percent: number | null;
  deltaVsPreviousWeek: number | null;
  categoryHours: CategoryHoursItem[];
  topActivities: TopActivityItem[];
  notes: string;
}

export class GetWeeklyLogWeekUseCase {
  constructor(
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly productivitySettingsRepository: ProductivitySettingsRepository,
    private readonly weekNoteRepository: WeekNoteRepository,
  ) {}

  async execute(userId: string, year: number, weekNumber: number): Promise<WeeklyLogWeekDetail> {
    const { start, end } = getWeekRangeForNumber(year, weekNumber);
    const rangeLabel = formatRangeLabel(start, end);

    const [logs, settings, notes] = await Promise.all([
      this.activityLogRepository.findDetailedByUserAndDateRange(userId, formatDateOnly(start), formatDateOnly(end)),
      this.productivitySettingsRepository.find(userId),
      this.weekNoteRepository.find(userId, year, weekNumber),
    ]);

    const weeklyTargetHours = settings?.weeklyTargetHours ?? DEFAULT_PRODUCTIVITY_SETTINGS.weeklyTargetHours;
    const percent = computePercent(logs, weeklyTargetHours);

    let deltaVsPreviousWeek: number | null = null;
    if (percent !== null && weekNumber > 1) {
      const previousRange = getWeekRangeForNumber(year, weekNumber - 1);
      const previousLogs = await this.activityLogRepository.findDetailedByUserAndDateRange(
        userId,
        formatDateOnly(previousRange.start),
        formatDateOnly(previousRange.end),
      );
      const previousPercent = computePercent(previousLogs, weeklyTargetHours);
      deltaVsPreviousWeek = previousPercent !== null ? percent - previousPercent : null;
    }

    const categoryHours = aggregateByCategory(logs);
    const topActivities = aggregateTopActivities(logs);

    return {
      weekNumber,
      year,
      rangeLabel,
      percent,
      deltaVsPreviousWeek,
      categoryHours,
      topActivities,
      notes: notes ?? '',
    };
  }
}

function computePercent(logs: ActivityLogDetail[], weeklyTargetHours: number): number | null {
  if (logs.length === 0) return null;
  const hours = logs.reduce((total, log) => total + log.hours, 0);
  return weeklyTargetHours > 0 ? Math.min(100, Math.round((hours / weeklyTargetHours) * 100)) : 0;
}

function aggregateByCategory(logs: ActivityLogDetail[]): CategoryHoursItem[] {
  const byCategory = new Map<string, CategoryHoursItem>();
  for (const log of logs) {
    const existing = byCategory.get(log.categoryId);
    if (existing) {
      existing.hours = round2(existing.hours + log.hours);
    } else {
      byCategory.set(log.categoryId, { categoryId: log.categoryId, name: log.categoryName, color: log.categoryColor, hours: log.hours });
    }
  }
  return Array.from(byCategory.values());
}

function aggregateTopActivities(logs: ActivityLogDetail[]): TopActivityItem[] {
  const byActivity = new Map<string, number>();
  for (const log of logs) {
    byActivity.set(log.activityName, (byActivity.get(log.activityName) ?? 0) + log.hours);
  }
  return Array.from(byActivity.entries())
    .map(([name, hours]) => ({ name, hours: round2(hours) }))
    .filter((item) => item.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
