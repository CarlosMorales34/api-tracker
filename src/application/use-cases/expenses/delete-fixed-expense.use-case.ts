import { FixedMonthlyExpenseRepository } from '../../../domain/repositories/fixed-monthly-expense.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteFixedExpenseUseCase {
  constructor(private readonly fixedMonthlyExpenseRepository: FixedMonthlyExpenseRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const expense = await this.fixedMonthlyExpenseRepository.findById(id);
    if (!expense || expense.userId !== userId) {
      throw new NotFoundError('FixedMonthlyExpense', id);
    }

    await this.fixedMonthlyExpenseRepository.deleteById(id);
  }
}
