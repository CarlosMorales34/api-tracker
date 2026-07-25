import { FinanceAnnualIncomeRepository } from '../../../domain/repositories/finance-annual-income.repository';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';

export interface FinanceAnnualIncomeView {
  id: string | null;
  year: number;
  amount: number;
  growthPercent: number | null;
  // true cuando el monto es una suma en vivo de finance_entries (el año
  // tiene ingresos semanales capturados) en vez de un total puesto a mano.
  isLive: boolean;
}

export class ListFinanceAnnualIncomeUseCase {
  constructor(
    private readonly financeAnnualIncomeRepository: FinanceAnnualIncomeRepository,
    private readonly moneyEntryRepository: MoneyEntryRepository,
  ) {}

  async execute(userId: string): Promise<FinanceAnnualIncomeView[]> {
    const [manualEntries, liveYears] = await Promise.all([
      this.financeAnnualIncomeRepository.findAllByUserId(userId),
      this.moneyEntryRepository.findDistinctYearsWithIncome(userId),
    ]);

    const years = new Set<number>([...manualEntries.map((entry) => entry.year), ...liveYears]);
    const liveYearSet = new Set(liveYears);

    const rows = await Promise.all(
      [...years].map(async (year) => {
        const manual = manualEntries.find((entry) => entry.year === year) ?? null;
        const isLive = liveYearSet.has(year);
        const amount = isLive ? await this.moneyEntryRepository.sumByUserTypeAndYear(userId, 'income', year) : manual!.amount;
        return { id: manual?.id ?? null, year, amount, isLive };
      }),
    );

    const byYear = new Map(rows.map((row) => [row.year, row.amount]));
    return rows
      .sort((a, b) => b.year - a.year)
      .map((row) => {
        const previousAmount = byYear.get(row.year - 1) ?? null;
        const growthPercent =
          previousAmount !== null && previousAmount !== 0
            ? Math.round(((row.amount - previousAmount) / previousAmount) * 10000) / 100
            : null;
        return { ...row, growthPercent };
      });
  }
}
