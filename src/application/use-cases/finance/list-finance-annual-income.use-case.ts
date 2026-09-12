import { FinanceAnnualIncomeRepository } from '../../../domain/repositories/finance-annual-income.repository';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { annualGrowthPercent } from '../../../shared/utils/finance-calculations';

export interface FinanceAnnualIncomeView {
  id: string | null;
  year: number;
  amount: number;
  growthPercent: number | null;
  // true cuando el monto es una suma en vivo de finance_entries (el año
  // tiene ingresos semanales capturados) en vez de un total puesto a mano.
  isLive: boolean;
  // true si un año "en vivo" mezcla monedas distintas entre sus
  // finance_entries -- amount es una suma cruda que no se puede confiar
  // como una sola moneda; el front debe mostrar "no calculable".
  isMixedCurrency: boolean;
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
        if (!isLive) {
          return { id: manual?.id ?? null, year, amount: manual!.amount, isLive, isMixedCurrency: false };
        }
        const [amount, currencies] = await Promise.all([
          this.moneyEntryRepository.sumByUserTypeAndYear(userId, 'income', year),
          this.moneyEntryRepository.findDistinctCurrenciesForYear(userId, 'income', year),
        ]);
        return { id: manual?.id ?? null, year, amount, isLive, isMixedCurrency: currencies.length > 1 };
      }),
    );

    const byYear = new Map(rows.map((row) => [row.year, row.amount]));
    return rows
      .sort((a, b) => b.year - a.year)
      .map((row) => ({ ...row, growthPercent: annualGrowthPercent(row.amount, byYear.get(row.year - 1) ?? null) }));
  }
}
