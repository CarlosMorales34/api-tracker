import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { BodyMeasurementRepository } from '../../../domain/repositories/body-measurement.repository';
import { BodyGoalRepository } from '../../../domain/repositories/body-goal.repository';
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
    private readonly bodyMeasurementRepository: BodyMeasurementRepository,
    private readonly bodyGoalRepository: BodyGoalRepository,
  ) {}

  async execute(userId: string): Promise<HomeSummary> {
    const today = parseDateOnly(todayDateOnly());
    const { year: weekYear, weekNumber } = getWeekNumberForDate(today);
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth() + 1;

    const [streak, weekDetail, incomeThisMonth, expenseThisMonth, latestMeasurement, activeGoal, yearsWithFinance] =
      await Promise.all([
        this.computeStreak(userId),
        this.getWeeklyLogWeekUseCase.execute(userId, weekYear, weekNumber),
        this.moneyEntryRepository.sumByUserTypeAndMonth(userId, 'income', currentYear, currentMonth),
        this.moneyEntryRepository.sumByUserTypeAndMonth(userId, 'expense', currentYear, currentMonth),
        this.bodyMeasurementRepository.findLatest(userId),
        this.bodyGoalRepository.findActive(userId),
        this.moneyEntryRepository.findDistinctYearsWithEntries(userId),
      ]);

    const monthlyBalanceHasData = incomeThisMonth > 0 || expenseThisMonth > 0;

    // targetWeightKg puede ser null (metas 'maintain'/'recomp' no siempre
    // tienen un único número) -- ahí se cae al peso inicial de la meta
    // como referencia, en vez de mostrar un 0 engañoso.
    const goalKg = activeGoal?.targetWeightKg ?? activeGoal?.startWeightKg ?? 0;

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
        kg: latestMeasurement?.weightKg ?? null,
        goalKg,
        hasData: latestMeasurement?.weightKg !== null && latestMeasurement?.weightKg !== undefined,
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
