import { FinanceAnnualIncomeRepository } from '../../../domain/repositories/finance-annual-income.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteFinanceAnnualIncomeUseCase {
  constructor(private readonly financeAnnualIncomeRepository: FinanceAnnualIncomeRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const entry = await this.financeAnnualIncomeRepository.findById(id);
    if (!entry || entry.userId !== userId) {
      throw new NotFoundError('FinanceAnnualIncome', id);
    }

    await this.financeAnnualIncomeRepository.deleteById(id);
  }
}
