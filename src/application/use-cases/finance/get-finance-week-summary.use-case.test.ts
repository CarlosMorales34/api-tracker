import { describe, expect, it, vi } from 'vitest';
import { GetFinanceWeekSummaryUseCase } from './get-finance-week-summary.use-case';
import { MoneyEntry } from '../../../domain/entities/money-entry.entity';

function entry(amount: number, currency: string | null) {
  return MoneyEntry.fromPersistence({
    id: crypto.randomUUID(),
    userId: 'user-1',
    type: 'income',
    name: 'Sueldo',
    amount,
    recurrence: 'unique',
    weekStartDate: '2026-09-05',
    currency,
  });
}

function makeUseCase(income: MoneyEntry[], settingsOverrides: Partial<{ walletBalance: number; debtTotal: number; currency: string }> = {}) {
  const moneyEntryRepository = { findByUserAndWeek: vi.fn().mockResolvedValue(income) } as any;
  const financeSettingsRepository = {
    find: vi.fn().mockResolvedValue({
      debtTotal: settingsOverrides.debtTotal ?? 0,
      currency: settingsOverrides.currency ?? 'MXN',
      week1AnchorDate: null,
      walletBalance: settingsOverrides.walletBalance ?? 0,
    }),
    adjustWalletBalance: vi.fn(),
  } as any;
  const debtPaymentRepository = {
    sumByUser: vi.fn().mockResolvedValue(0),
    sumByUserAndWeek: vi.fn().mockResolvedValue(0),
    sumInterestByUserAndWeek: vi.fn().mockResolvedValue(0),
  } as any;
  const savingsRepository = {
    sumByUser: vi.fn().mockResolvedValue(0),
    sumByUserAndWeek: vi.fn().mockResolvedValue(0),
  } as any;
  const dailyExpenseRepository = { sumByUserAndDateRange: vi.fn().mockResolvedValue(0) } as any;
  const fixedMonthlyExpenseRepository = { findAllByUserId: vi.fn().mockResolvedValue([]) } as any;
  const fixedExpenseChargeRepository = { createIfNotExists: vi.fn() } as any;

  return new GetFinanceWeekSummaryUseCase(
    moneyEntryRepository,
    financeSettingsRepository,
    debtPaymentRepository,
    savingsRepository,
    dailyExpenseRepository,
    fixedMonthlyExpenseRepository,
    fixedExpenseChargeRepository,
  );
}

describe('GetFinanceWeekSummaryUseCase', () => {
  it('currency = la moneda de los ingresos cuando todos comparten una', async () => {
    const useCase = makeUseCase([entry(1000, 'USD'), entry(500, 'USD')], { currency: 'MXN' });
    const summary = await useCase.execute('user-1', '2026-09-05');
    expect(summary.currency).toBe('USD');
    expect(summary.totalIncome).toBe(1500);
  });

  it("currency = 'mixed' cuando los ingresos de la semana no comparten una sola moneda", async () => {
    const useCase = makeUseCase([entry(1000, 'MXN'), entry(500, 'USD')]);
    const summary = await useCase.execute('user-1', '2026-09-05');
    expect(summary.currency).toBe('mixed');
  });

  it('filas viejas sin currency (NULL) usan la moneda actual del usuario para el chequeo de mezcla', async () => {
    const useCase = makeUseCase([entry(1000, null)], { currency: 'MXN' });
    const summary = await useCase.execute('user-1', '2026-09-05');
    expect(summary.currency).toBe('MXN');
  });

  it('netWorth = liquidez - deuda restante, NUNCA suma crédito', async () => {
    const useCase = makeUseCase([], { walletBalance: 10000, debtTotal: 3000 });
    const summary = await useCase.execute('user-1', '2026-09-05');
    expect(summary.netWorth).toBe(7000);
  });

  it('balance = totalIncome - totalExpense, expuesto explícitamente (antes el front lo calculaba solo)', async () => {
    const useCase = makeUseCase([entry(2000, 'MXN')]);
    const summary = await useCase.execute('user-1', '2026-09-05');
    expect(summary.balance).toBe(summary.totalIncome - summary.totalExpense);
  });
});
