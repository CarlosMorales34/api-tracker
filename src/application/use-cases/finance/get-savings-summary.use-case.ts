import { DailyExpenseRepository } from '../../../domain/repositories/daily-expense.repository';
import { FinanceDebtPaymentRepository } from '../../../domain/repositories/finance-debt-payment.repository';
import { FixedMonthlyExpenseRepository } from '../../../domain/repositories/fixed-monthly-expense.repository';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { accumulatedSavings } from '../../../shared/utils/finance-calculations';
import { todayDateOnly } from '../../../shared/utils/week';

export interface SavingsSummary {
  year: number;
  // Ahorro neto del año hasta hoy = ingresos - gastos reales (calculado, ya
  // no un log manual -- ver finance_savings_log, que queda sin usarse desde
  // acá). Incluye el interés de abonos a deuda como gasto (el capital
  // abonado NO es gasto, ya baja deuda directamente). Puede ser negativo si
  // el usuario gastó más de lo que ingresó.
  accumulated: number;
  thisMonth: number;
}

// Nota sobre la aproximación de gastos fijos: fixedMonthlyExpenseRepository
// no lleva "desde cuándo" existe un gasto fijo (no se tocó ese esquema, es
// de Gastos diarios) -- se asume el total fijo ACTUAL constante por cada mes
// transcurrido del año. Es una aproximación razonable para un uso personal,
// no un hecho exacto si el usuario agregó/quitó gastos fijos a mitad de año.
export class GetSavingsSummaryUseCase {
  constructor(
    private readonly moneyEntryRepository: MoneyEntryRepository,
    private readonly dailyExpenseRepository: DailyExpenseRepository,
    private readonly fixedMonthlyExpenseRepository: FixedMonthlyExpenseRepository,
    private readonly debtPaymentRepository: FinanceDebtPaymentRepository,
  ) {}

  async execute(userId: string, year: number): Promise<SavingsSummary> {
    const today = todayDateOnly();
    const [todayYear, todayMonth] = today.split('-').map(Number) as [number, number];
    const isCurrentYear = year === todayYear;
    const monthsElapsed = isCurrentYear ? todayMonth : 12;
    const yearEnd = isCurrentYear ? today : `${year}-12-31`;
    const monthStart = `${todayYear}-${String(todayMonth).padStart(2, '0')}-01`;

    const [yearIncome, yearDailyExpense, fixedMonthlyTotal, yearInterest, monthIncome, monthDailyExpense, monthInterest] =
      await Promise.all([
        this.moneyEntryRepository.sumByUserTypeAndYear(userId, 'income', year),
        this.dailyExpenseRepository.sumByUserAndDateRange(userId, `${year}-01-01`, yearEnd),
        this.fixedMonthlyExpenseRepository.sumByUserId(userId),
        this.debtPaymentRepository.sumInterestByUserAndDateRange(userId, `${year}-01-01`, yearEnd),
        this.moneyEntryRepository.sumByUserTypeAndMonth(userId, 'income', todayYear, todayMonth),
        this.dailyExpenseRepository.sumByUserAndMonth(userId, todayYear, todayMonth),
        isCurrentYear ? this.debtPaymentRepository.sumInterestByUserAndDateRange(userId, monthStart, today) : Promise.resolve(0),
      ]);

    const yearFixedExpense = fixedMonthlyTotal * monthsElapsed;
    const thisMonthFixedExpense = isCurrentYear ? fixedMonthlyTotal : 0;

    return {
      year,
      accumulated: accumulatedSavings([{ income: yearIncome, expense: yearDailyExpense + yearFixedExpense + yearInterest }]),
      thisMonth: isCurrentYear
        ? accumulatedSavings([{ income: monthIncome, expense: monthDailyExpense + thisMonthFixedExpense + monthInterest }])
        : 0,
    };
  }
}
