import { DEFAULT_FINANCE_SETTINGS } from '../../../domain/entities/finance-settings.entity';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { DailyExpenseRepository } from '../../../domain/repositories/daily-expense.repository';
import { FixedMonthlyExpenseRepository } from '../../../domain/repositories/fixed-monthly-expense.repository';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { formatDateOnly, getWeekRange, parseDateOnly, todayDateOnly } from '../../../shared/utils/week';

export interface ExpensesSummary {
  monthIncome: number;
  monthDailyTotal: number;
  fixedTotal: number;
  monthExpenseTotal: number;
  sobrante: number;
  weekTotal: number;
  currency: string;
}

export class GetExpensesSummaryUseCase {
  constructor(
    private readonly moneyEntryRepository: MoneyEntryRepository,
    private readonly dailyExpenseRepository: DailyExpenseRepository,
    private readonly fixedMonthlyExpenseRepository: FixedMonthlyExpenseRepository,
    private readonly financeSettingsRepository: FinanceSettingsRepository,
  ) {}

  async execute(userId: string, date?: string): Promise<ExpensesSummary> {
    const targetDate = date ?? todayDateOnly();
    const parsed = parseDateOnly(targetDate);
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth() + 1;
    const { start, end } = getWeekRange(parsed);

    const [monthIncome, monthDailyTotal, fixedTotal, weekTotal, settings] = await Promise.all([
      this.moneyEntryRepository.sumByUserTypeAndMonth(userId, 'income', year, month),
      this.dailyExpenseRepository.sumByUserAndMonth(userId, year, month),
      this.fixedMonthlyExpenseRepository.sumByUserId(userId),
      this.dailyExpenseRepository.sumByUserAndDateRange(userId, formatDateOnly(start), formatDateOnly(end)),
      this.financeSettingsRepository.find(userId),
    ]);

    const monthExpenseTotal = monthDailyTotal + fixedTotal;
    const resolvedSettings = settings ?? DEFAULT_FINANCE_SETTINGS;

    return {
      monthIncome,
      monthDailyTotal,
      fixedTotal,
      monthExpenseTotal,
      sobrante: resolvedSettings.walletBalance - monthExpenseTotal,
      weekTotal,
      currency: resolvedSettings.currency,
    };
  }
}
