import { FixedMonthlyExpense } from '../../../domain/entities/fixed-monthly-expense.entity';
import { FixedMonthlyExpenseRepository } from '../../../domain/repositories/fixed-monthly-expense.repository';

export class ListFixedExpensesUseCase {
  constructor(private readonly fixedMonthlyExpenseRepository: FixedMonthlyExpenseRepository) {}

  async execute(userId: string): Promise<FixedMonthlyExpense[]> {
    return this.fixedMonthlyExpenseRepository.findAllByUserId(userId);
  }
}
