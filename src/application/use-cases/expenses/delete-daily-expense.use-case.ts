import { DailyExpenseRepository } from '../../../domain/repositories/daily-expense.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteDailyExpenseUseCase {
  constructor(private readonly dailyExpenseRepository: DailyExpenseRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const expense = await this.dailyExpenseRepository.findById(id);
    if (!expense || expense.userId !== userId) {
      throw new NotFoundError('DailyExpense', id);
    }

    await this.dailyExpenseRepository.deleteById(id);
  }
}
