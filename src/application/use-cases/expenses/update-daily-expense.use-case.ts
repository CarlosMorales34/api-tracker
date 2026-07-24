import { DailyExpense } from '../../../domain/entities/daily-expense.entity';
import { DailyExpenseRepository } from '../../../domain/repositories/daily-expense.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { UpdateDailyExpenseDto } from '../../dtos/update-daily-expense.dto';

export class UpdateDailyExpenseUseCase {
  constructor(private readonly dailyExpenseRepository: DailyExpenseRepository) {}

  async execute(userId: string, id: string, dto: UpdateDailyExpenseDto): Promise<DailyExpense> {
    const expense = await this.dailyExpenseRepository.findById(id);
    if (!expense || expense.userId !== userId) {
      throw new NotFoundError('DailyExpense', id);
    }

    expense.applyUpdate(dto);
    await this.dailyExpenseRepository.update(expense);
    return expense;
  }
}
