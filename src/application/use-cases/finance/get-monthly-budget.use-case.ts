import { DailyExpenseRepository } from '../../../domain/repositories/daily-expense.repository';
import { FixedMonthlyExpenseRepository } from '../../../domain/repositories/fixed-monthly-expense.repository';
import { MonthlyBudgetRepository } from '../../../domain/repositories/monthly-budget.repository';
import { budgetPercentUsed, budgetRemaining } from '../../../shared/utils/finance-calculations';

export interface MonthlyBudgetSummary {
  year: number;
  month: number;
  // null = el usuario todavía no asignó presupuesto este mes -- distinto de
  // un presupuesto real de $0 (nunca se muestra como si fuera $0).
  budgetAmount: number | null;
  currency: string | null;
  monthExpenseTotal: number;
  remaining: number | null;
  percentUsed: number | null;
}

// Presupuesto mensual real, separado de walletBalance (liquidez) -- no
// reusa GetExpensesSummaryUseCase a propósito, para no tocar el módulo de
// Gastos diarios (esa "sobrante" es su propio concepto, se deja intacta).
export class GetMonthlyBudgetUseCase {
  constructor(
    private readonly monthlyBudgetRepository: MonthlyBudgetRepository,
    private readonly dailyExpenseRepository: DailyExpenseRepository,
    private readonly fixedMonthlyExpenseRepository: FixedMonthlyExpenseRepository,
  ) {}

  async execute(userId: string, year: number, month: number): Promise<MonthlyBudgetSummary> {
    const [budget, monthDailyTotal, fixedTotal] = await Promise.all([
      this.monthlyBudgetRepository.findByUserYearMonth(userId, year, month),
      this.dailyExpenseRepository.sumByUserAndMonth(userId, year, month),
      this.fixedMonthlyExpenseRepository.sumByUserId(userId),
    ]);
    const monthExpenseTotal = monthDailyTotal + fixedTotal;

    return {
      year,
      month,
      budgetAmount: budget?.amount ?? null,
      currency: budget?.currency ?? null,
      monthExpenseTotal,
      remaining: budget ? budgetRemaining(budget.amount, monthExpenseTotal) : null,
      percentUsed: budget ? budgetPercentUsed(budget.amount, monthExpenseTotal) : null,
    };
  }
}
