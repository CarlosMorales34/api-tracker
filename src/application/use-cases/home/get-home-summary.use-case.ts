import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { WeightEntryRepository } from '../../../domain/repositories/weight-entry.repository';
import { WeightSettingsRepository } from '../../../domain/repositories/weight-settings.repository';
import { DEFAULT_WEIGHT_SETTINGS } from '../../../domain/entities/weight-settings.entity';
import { GetWeeklyLogWeekUseCase, CategoryHoursItem } from '../weekly-log/get-weekly-log-week.use-case';
import { addDaysUTC, formatDateOnly, getWeekNumberForDate, parseDateOnly, todayDateOnly } from '../../../shared/utils/week';

const STREAK_LOOKBACK_DAYS = 120;

export interface HomeSummary {
  streak: { days: number; hasData: boolean };
  productivity: { percent: number | null; hasData: boolean };
  categoryHours: CategoryHoursItem[];
  monthlyBalance: { amount: number; income: number; expenses: number; hasData: boolean };
  currentWeight: { kg: number | null; goalKg: number; hasData: boolean };
  annualBalance: {
    year: number;
    amount: number;
    growthPercentVsPreviousYear: number | null;
    byYear: { year: number; amount: number }[];
    hasData: boolean;
  };
}

// Agrega, en un solo viaje, todo lo que pinta el Home -- reusa los mismos
// use-cases/repositorios de cada módulo (Registro semanal, Finanzas, Peso)
// en vez de duplicar sus cálculos. Cada sección trae su propio `hasData`
// para que el front pueda mostrar el estado "conociéndote" sin adivinar si
// un 0 es un dato real o simplemente ausencia de datos.
export class GetHomeSummaryUseCase {
  constructor(
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly getWeeklyLogWeekUseCase: GetWeeklyLogWeekUseCase,
    private readonly moneyEntryRepository: MoneyEntryRepository,
    private readonly weightEntryRepository: WeightEntryRepository,
    private readonly weightSettingsRepository: WeightSettingsRepository,
  ) {}

  async execute(userId: string): Promise<HomeSummary> {
    const today = parseDateOnly(todayDateOnly());
    const { year: weekYear, weekNumber } = getWeekNumberForDate(today);
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth() + 1;

    const [streak, weekDetail, incomeThisMonth, expenseThisMonth, weightYear, weightSettings, yearsWithFinance] =
      await Promise.all([
        this.computeStreak(userId),
        this.getWeeklyLogWeekUseCase.execute(userId, weekYear, weekNumber),
        this.moneyEntryRepository.sumByUserTypeAndMonth(userId, 'income', currentYear, currentMonth),
        this.moneyEntryRepository.sumByUserTypeAndMonth(userId, 'expense', currentYear, currentMonth),
        this.weightEntryRepository.findAllByUserAndYear(userId, currentYear),
        this.weightSettingsRepository.find(userId),
        this.moneyEntryRepository.findDistinctYearsWithEntries(userId),
      ]);

    const monthlyBalanceHasData = incomeThisMonth > 0 || expenseThisMonth > 0;

    const currentWeightEntry = [...weightYear].reverse().find((entry) => entry.value !== null) ?? null;
    const goalKg = (weightSettings ?? DEFAULT_WEIGHT_SETTINGS).goalKg;

    const annualBalance = await this.computeAnnualBalance(userId, currentYear, yearsWithFinance);

    return {
      streak: { days: streak, hasData: streak > 0 },
      productivity: {
        percent: weekDetail.percent,
        hasData: weekDetail.percent !== null,
      },
      categoryHours: weekDetail.categoryHours,
      monthlyBalance: {
        amount: incomeThisMonth - expenseThisMonth,
        income: incomeThisMonth,
        expenses: expenseThisMonth,
        hasData: monthlyBalanceHasData,
      },
      currentWeight: {
        kg: currentWeightEntry?.value ?? null,
        goalKg,
        hasData: currentWeightEntry !== null,
      },
      annualBalance,
    };
  }

  private async computeStreak(userId: string): Promise<number> {
    const today = todayDateOnly();
    const todayDate = parseDateOnly(today);
    const from = formatDateOnly(addDaysUTC(todayDate, -STREAK_LOOKBACK_DAYS));
    const logs = await this.activityLogRepository.findByUserAndDateRange(userId, from, today);
    const daysWithLogs = new Set(logs.map((log) => log.logDate));

    let streak = 0;
    let cursor = todayDate;
    for (;;) {
      const cursorDateOnly = formatDateOnly(cursor);
      if (!daysWithLogs.has(cursorDateOnly)) break;
      streak += 1;
      cursor = addDaysUTC(cursor, -1);
    }
    return streak;
  }

  private async computeAnnualBalance(
    userId: string,
    currentYear: number,
    yearsWithFinance: number[],
  ): Promise<HomeSummary['annualBalance']> {
    if (!yearsWithFinance.includes(currentYear)) {
      return { year: currentYear, amount: 0, growthPercentVsPreviousYear: null, byYear: [], hasData: false };
    }

    const otherYears = yearsWithFinance.filter((year) => year !== currentYear).slice(0, 3);
    const yearsToFetch = [currentYear, ...otherYears];

    const totals = await Promise.all(
      yearsToFetch.map(async (year) => {
        const [income, expense] = await Promise.all([
          this.moneyEntryRepository.sumByUserTypeAndYear(userId, 'income', year),
          this.moneyEntryRepository.sumByUserTypeAndYear(userId, 'expense', year),
        ]);
        return { year, amount: income - expense };
      }),
    );

    const current = totals[0]!;
    const previous = totals[1] ?? null;
    const growthPercentVsPreviousYear =
      previous && previous.amount !== 0 ? Math.round(((current.amount - previous.amount) / Math.abs(previous.amount)) * 100) : null;

    return {
      year: currentYear,
      amount: current.amount,
      growthPercentVsPreviousYear,
      byYear: totals.slice(1),
      hasData: true,
    };
  }
}
