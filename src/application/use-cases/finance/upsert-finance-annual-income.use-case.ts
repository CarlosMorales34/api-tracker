import { randomUUID } from 'node:crypto';
import { FinanceAnnualIncome } from '../../../domain/entities/finance-annual-income.entity';
import { FinanceAnnualIncomeRepository } from '../../../domain/repositories/finance-annual-income.repository';

export class UpsertFinanceAnnualIncomeUseCase {
  constructor(private readonly financeAnnualIncomeRepository: FinanceAnnualIncomeRepository) {}

  async execute(userId: string, year: number, amount: number): Promise<FinanceAnnualIncome> {
    const existing = await this.financeAnnualIncomeRepository.findByUserAndYear(userId, year);
    const entry = FinanceAnnualIncome.create({
      id: existing?.id ?? randomUUID(),
      userId,
      year,
      amount,
    });

    await this.financeAnnualIncomeRepository.upsert(entry);
    return entry;
  }
}
