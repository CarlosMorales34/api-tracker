import { WeightEntryRepository } from '../../../domain/repositories/weight-entry.repository';
import { WeightSettingsRepository } from '../../../domain/repositories/weight-settings.repository';
import { DEFAULT_WEIGHT_SETTINGS, WeightGoalDirection } from '../../../domain/entities/weight-settings.entity';

export interface WeightMonthView {
  year: number;
  month: number;
  value: number | null;
  note: string | null;
}

export interface WeightYearSummary {
  year: number;
  months: WeightMonthView[];
  currentWeight: number | null;
  deltaVsPreviousMonth: number | null;
  bestEver: { value: number; year: number; month: number } | null;
  goalKg: number;
  goalDirection: WeightGoalDirection;
}

export class GetWeightYearUseCase {
  constructor(
    private readonly weightEntryRepository: WeightEntryRepository,
    private readonly weightSettingsRepository: WeightSettingsRepository,
  ) {}

  async execute(userId: string, year: number): Promise<WeightYearSummary> {
    const settings = (await this.weightSettingsRepository.find(userId)) ?? DEFAULT_WEIGHT_SETTINGS;
    const [rows, bestEver] = await Promise.all([
      this.weightEntryRepository.findAllByUserAndYear(userId, year),
      this.weightEntryRepository.findBestEver(userId, settings.goalDirection),
    ]);

    const byMonth = new Map(rows.map((row) => [row.month, row]));
    const months: WeightMonthView[] = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const row = byMonth.get(month);
      return { year, month, value: row?.value ?? null, note: row?.note ?? null };
    });

    // currentWeight = valor del mes no-null MÁS RECIENTE de este año.
    // deltaVsPreviousMonth = contra el mes no-null anterior a ese, dentro del mismo año.
    const nonNullMonths = months.filter((month) => month.value !== null);
    const currentWeight = nonNullMonths.length > 0 ? nonNullMonths[nonNullMonths.length - 1]!.value : null;
    const previousMonth = nonNullMonths.length > 1 ? nonNullMonths[nonNullMonths.length - 2]!.value : null;
    const deltaVsPreviousMonth = currentWeight !== null && previousMonth !== null ? round2(currentWeight - previousMonth) : null;

    return {
      year,
      months,
      currentWeight,
      deltaVsPreviousMonth,
      bestEver,
      goalKg: settings.goalKg,
      goalDirection: settings.goalDirection,
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
