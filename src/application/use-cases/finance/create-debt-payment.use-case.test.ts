import { describe, expect, it, vi } from 'vitest';
import { CreateDebtPaymentUseCase } from './create-debt-payment.use-case';
import { FinanceDebtPaymentRepository } from '../../../domain/repositories/finance-debt-payment.repository';
import { DomainError } from '../../../domain/errors/domain.error';

function makeRepo(): FinanceDebtPaymentRepository & { recordPayment: ReturnType<typeof vi.fn> } {
  return {
    recordPayment: vi.fn().mockResolvedValue(undefined),
    sumByUser: vi.fn(),
    sumByUserAndWeek: vi.fn(),
    sumInterestByUserAndWeek: vi.fn(),
  } as unknown as FinanceDebtPaymentRepository & { recordPayment: ReturnType<typeof vi.fn> };
}

describe('CreateDebtPaymentUseCase', () => {
  it('separa capital de interés: recordPayment recibe el delta de cartera (-total) y el capital (total - interés)', async () => {
    const repo = makeRepo();
    const useCase = new CreateDebtPaymentUseCase(repo);

    await useCase.execute('user-1', { weekStartDate: '2026-09-05', amount: 1000, interestAmount: 150 });

    expect(repo.recordPayment).toHaveBeenCalledTimes(1);
    const [payment, walletDelta, principalAmount] = repo.recordPayment.mock.calls[0]!;
    expect(payment.amount).toBe(1000);
    expect(payment.interestAmount).toBe(150);
    expect(walletDelta).toBe(-1000); // la cartera baja por el TOTAL del abono
    expect(principalAmount).toBe(850); // la deuda solo baja por el capital
  });

  it('interestAmount por default es 0 -- mismo comportamiento que antes (todo el abono baja deuda)', async () => {
    const repo = makeRepo();
    const useCase = new CreateDebtPaymentUseCase(repo);

    await useCase.execute('user-1', { weekStartDate: '2026-09-05', amount: 500 });

    const [payment, walletDelta, principalAmount] = repo.recordPayment.mock.calls[0]!;
    expect(payment.interestAmount).toBe(0);
    expect(walletDelta).toBe(-500);
    expect(principalAmount).toBe(500);
  });

  it('rechaza un abono <= 0', async () => {
    const repo = makeRepo();
    const useCase = new CreateDebtPaymentUseCase(repo);
    await expect(useCase.execute('user-1', { weekStartDate: '2026-09-05', amount: 0 })).rejects.toThrow(DomainError);
    expect(repo.recordPayment).not.toHaveBeenCalled();
  });

  it('rechaza un interés mayor al total del abono', async () => {
    const repo = makeRepo();
    const useCase = new CreateDebtPaymentUseCase(repo);
    await expect(
      useCase.execute('user-1', { weekStartDate: '2026-09-05', amount: 100, interestAmount: 150 }),
    ).rejects.toThrow(DomainError);
    expect(repo.recordPayment).not.toHaveBeenCalled();
  });

  it('rechaza un interés negativo', async () => {
    const repo = makeRepo();
    const useCase = new CreateDebtPaymentUseCase(repo);
    await expect(
      useCase.execute('user-1', { weekStartDate: '2026-09-05', amount: 100, interestAmount: -10 }),
    ).rejects.toThrow(DomainError);
  });
});
