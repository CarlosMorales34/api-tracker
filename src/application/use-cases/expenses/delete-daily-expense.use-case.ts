import { DailyExpenseRepository } from '../../../domain/repositories/daily-expense.repository';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteDailyExpenseUseCase {
  constructor(
    private readonly dailyExpenseRepository: DailyExpenseRepository,
    private readonly financeSettingsRepository: FinanceSettingsRepository,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    const expense = await this.dailyExpenseRepository.findById(id);
    if (!expense || expense.userId !== userId) {
      throw new NotFoundError('DailyExpense', id);
    }

    await this.dailyExpenseRepository.deleteById(id);
    await this.financeSettingsRepository.adjustWalletBalance(userId, expense.amount);
  }
}
