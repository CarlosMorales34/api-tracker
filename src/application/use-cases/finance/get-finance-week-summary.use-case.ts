import { DEFAULT_FINANCE_SETTINGS } from '../../../domain/entities/finance-settings.entity';
import { MoneyEntry } from '../../../domain/entities/money-entry.entity';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { FinanceDebtPaymentRepository } from '../../../domain/repositories/finance-debt-payment.repository';
import { FinanceSavingsRepository } from '../../../domain/repositories/finance-savings.repository';
import { DailyExpenseRepository } from '../../../domain/repositories/daily-expense.repository';
import { FixedMonthlyExpenseRepository } from '../../../domain/repositories/fixed-monthly-expense.repository';
import { FixedExpenseChargeRepository } from '../../../domain/repositories/fixed-expense-charge.repository';
import { addDaysUTC, formatDateOnly, parseDateOnly, todayDateOnly } from '../../../shared/utils/week';

type MoneyEntryJSON = ReturnType<MoneyEntry['toJSON']>;

export interface FinanceWeekSummary {
  weekStartDate: string;
  income: MoneyEntryJSON[];
  totalIncome: number;
  // Fuente: Gastos diarios (daily_expenses + fixed_monthly_expenses), no
  // finance_entries -- Finanzas ya no captura gastos, evita duplicar el dato.
  totalExpense: number;
  debtTotal: number;
  debtPaid: number;
  debtRemaining: number;
  weekAbono: number;
  savingsAccumulated: number;
  weekSavings: number;
  currency: string;
  week1AnchorDate: string | null;
  walletBalance: number;
}

export class GetFinanceWeekSummaryUseCase {
  constructor(
    private readonly moneyEntryRepository: MoneyEntryRepository,
    private readonly financeSettingsRepository: FinanceSettingsRepository,
    private readonly debtPaymentRepository: FinanceDebtPaymentRepository,
    private readonly savingsRepository: FinanceSavingsRepository,
    private readonly dailyExpenseRepository: DailyExpenseRepository,
    private readonly fixedMonthlyExpenseRepository: FixedMonthlyExpenseRepository,
    private readonly fixedExpenseChargeRepository: FixedExpenseChargeRepository,
  ) {}

  async execute(userId: string, weekStartDate: string): Promise<FinanceWeekSummary> {
    const entries = await this.moneyEntryRepository.findByUserAndWeek(userId, weekStartDate);
    const income = entries.filter((entry) => entry.type === 'income');
    const totalIncome = sum(income.map((entry) => entry.amount));

    const weekEnd = formatDateOnly(addDaysUTC(parseDateOnly(weekStartDate), 6));
    const [debtPaid, weekAbono, savingsAccumulated, weekSavings, dailyExpenseTotal, fixedExpenseTotal] = await Promise.all([
      this.debtPaymentRepository.sumByUser(userId),
      this.debtPaymentRepository.sumByUserAndWeek(userId, weekStartDate),
      this.savingsRepository.sumByUser(userId),
      this.savingsRepository.sumByUserAndWeek(userId, weekStartDate),
      this.dailyExpenseRepository.sumByUserAndDateRange(userId, weekStartDate, weekEnd),
      this.sumFixedExpensesInWeek(userId, weekStartDate),
      // Cobra (una sola vez por ocurrencia mensual) los gastos programados
      // cuyo día ya pasó este mes, sin importar qué semana se esté viendo --
      // si esto dependiera de la semana mostrada, un gasto con día 1 nunca
      // se cobraría mientras el usuario navegue semanas de mediados de mes.
      this.chargeDueFixedExpenses(userId),
    ]);
    const totalExpense = sum([dailyExpenseTotal, fixedExpenseTotal]);

    // Se lee después de chargeDueFixedExpenses a propósito: esa llamada
    // puede haber ajustado wallet_balance -- el balance devuelto debe
    // reflejar eso, no una copia de antes del cargo.
    const settings = (await this.financeSettingsRepository.find(userId)) ?? DEFAULT_FINANCE_SETTINGS;

    return {
      weekStartDate,
      income: income.map((entry) => entry.toJSON()),
      totalIncome,
      totalExpense,
      debtTotal: settings.debtTotal,
      debtPaid,
      debtRemaining: settings.debtTotal - debtPaid,
      weekAbono,
      savingsAccumulated,
      weekSavings,
      currency: settings.currency,
      week1AnchorDate: settings.week1AnchorDate,
      walletBalance: settings.walletBalance,
    };
  }

  // Total de gastos programados que caen en la semana mostrada (incluye
  // días futuros dentro de esa semana) -- puramente informativo, no cobra.
  private async sumFixedExpensesInWeek(userId: string, weekStartDate: string): Promise<number> {
    const daysOfMonthInWeek = new Set<number>();
    const weekStart = parseDateOnly(weekStartDate);
    for (let i = 0; i < 7; i += 1) {
      daysOfMonthInWeek.add(addDaysUTC(weekStart, i).getUTCDate());
    }

    const fixedExpenses = await this.fixedMonthlyExpenseRepository.findAllByUserId(userId);
    return sum(
      fixedExpenses
        .filter((expense) => expense.dayOfMonth !== null && daysOfMonthInWeek.has(expense.dayOfMonth))
        .map((expense) => expense.amount),
    );
  }

  // Cobra la ocurrencia de ESTE mes calendario de cada gasto programado cuyo
  // día ya pasó, exactamente una vez (fixed_expense_charges), descontando la
  // cartera. Independiente de qué semana esté viendo el usuario. Si el día
  // configurado no existe en el mes (ej. 31 en un mes de 30), se ajusta al
  // último día del mes.
  private async chargeDueFixedExpenses(userId: string): Promise<void> {
    const today = todayDateOnly();
    const [todayYear, todayMonth] = today.split('-').map(Number) as [number, number];

    const fixedExpenses = await this.fixedMonthlyExpenseRepository.findAllByUserId(userId);
    for (const expense of fixedExpenses) {
      if (expense.dayOfMonth === null) continue;

      const chargeDate = clampToMonthEnd(todayYear, todayMonth, expense.dayOfMonth);
      if (chargeDate > today) continue;

      const isNewCharge = await this.fixedExpenseChargeRepository.createIfNotExists(
        expense.id,
        chargeDate,
        expense.amount,
      );
      if (isNewCharge) {
        await this.financeSettingsRepository.adjustWalletBalance(userId, -expense.amount);
      }
    }
  }
}

function clampToMonthEnd(year: number, month: number, day: number): string {
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfMonth);
  return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

function sum(values: number[]): number {
  return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}
