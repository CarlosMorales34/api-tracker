import { DEFAULT_FINANCE_SETTINGS } from '../../../domain/entities/finance-settings.entity';
import { MoneyEntry } from '../../../domain/entities/money-entry.entity';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { FinanceDebtPaymentRepository } from '../../../domain/repositories/finance-debt-payment.repository';
import { FinanceSavingsRepository } from '../../../domain/repositories/finance-savings.repository';

type MoneyEntryJSON = ReturnType<MoneyEntry['toJSON']>;

export interface FinanceWeekSummary {
  weekStartDate: string;
  income: MoneyEntryJSON[];
  expense: MoneyEntryJSON[];
  totalIncome: number;
  totalExpense: number;
  debtTotal: number;
  debtPaid: number;
  debtRemaining: number;
  weekAbono: number;
  savingsAccumulated: number;
  weekSavings: number;
  currency: string;
}

export class GetFinanceWeekSummaryUseCase {
  constructor(
    private readonly moneyEntryRepository: MoneyEntryRepository,
    private readonly financeSettingsRepository: FinanceSettingsRepository,
    private readonly debtPaymentRepository: FinanceDebtPaymentRepository,
    private readonly savingsRepository: FinanceSavingsRepository,
  ) {}

  async execute(userId: string, weekStartDate: string): Promise<FinanceWeekSummary> {
    const entries = await this.moneyEntryRepository.findByUserAndWeek(userId, weekStartDate);
    const income = entries.filter((entry) => entry.type === 'income');
    const expense = entries.filter((entry) => entry.type === 'expense');
    const totalIncome = sum(income.map((entry) => entry.amount));
    const totalExpense = sum(expense.map((entry) => entry.amount));

    const settings = (await this.financeSettingsRepository.find(userId)) ?? DEFAULT_FINANCE_SETTINGS;

    const [debtPaid, weekAbono, savingsAccumulated, weekSavings] = await Promise.all([
      this.debtPaymentRepository.sumByUser(userId),
      this.debtPaymentRepository.sumByUserAndWeek(userId, weekStartDate),
      this.savingsRepository.sumByUser(userId),
      this.savingsRepository.sumByUserAndWeek(userId, weekStartDate),
    ]);

    return {
      weekStartDate,
      income: income.map((entry) => entry.toJSON()),
      expense: expense.map((entry) => entry.toJSON()),
      totalIncome,
      totalExpense,
      debtTotal: settings.debtTotal,
      debtPaid,
      debtRemaining: settings.debtTotal - debtPaid,
      weekAbono,
      savingsAccumulated,
      weekSavings,
      currency: settings.currency,
    };
  }
}

function sum(values: number[]): number {
  return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}
