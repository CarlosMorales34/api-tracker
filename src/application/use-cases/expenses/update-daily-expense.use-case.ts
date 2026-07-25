import { DailyExpense } from '../../../domain/entities/daily-expense.entity';
import { DailyExpenseRepository } from '../../../domain/repositories/daily-expense.repository';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { UpdateDailyExpenseDto } from '../../dtos/update-daily-expense.dto';

export class UpdateDailyExpenseUseCase {
  constructor(
    private readonly dailyExpenseRepository: DailyExpenseRepository,
    private readonly financeSettingsRepository: FinanceSettingsRepository,
  ) {}

  async execute(userId: string, id: string, dto: UpdateDailyExpenseDto): Promise<DailyExpense> {
    const expense = await this.dailyExpenseRepository.findById(id);
    if (!expense || expense.userId !== userId) {
      throw new NotFoundError('DailyExpense', id);
    }

    const previousAmount = expense.amount;
    expense.applyUpdate(dto);
    await this.dailyExpenseRepository.update(expense);

    if (dto.amount !== undefined && dto.amount !== previousAmount) {
      await this.financeSettingsRepository.adjustWalletBalance(userId, previousAmount - expense.amount);
    }
    return expense;
  }
}
