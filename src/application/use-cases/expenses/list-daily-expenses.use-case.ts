import { DailyExpense } from '../../../domain/entities/daily-expense.entity';
import { DailyExpenseRepository } from '../../../domain/repositories/daily-expense.repository';
import { todayDateOnly } from '../../../shared/utils/week';

export class ListDailyExpensesUseCase {
  constructor(private readonly dailyExpenseRepository: DailyExpenseRepository) {}

  async execute(userId: string, date?: string): Promise<DailyExpense[]> {
    const targetDate = date ?? todayDateOnly();
    return this.dailyExpenseRepository.findByUserAndDate(userId, targetDate);
  }
}
