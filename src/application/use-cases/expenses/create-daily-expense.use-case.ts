import { randomUUID } from 'node:crypto';
import { DailyExpense } from '../../../domain/entities/daily-expense.entity';
import { DailyExpenseRepository } from '../../../domain/repositories/daily-expense.repository';
import { CreateDailyExpenseDto } from '../../dtos/create-daily-expense.dto';

export class CreateDailyExpenseUseCase {
  constructor(private readonly dailyExpenseRepository: DailyExpenseRepository) {}

  async execute(userId: string, dto: CreateDailyExpenseDto): Promise<DailyExpense> {
    const expense = DailyExpense.create({
      id: randomUUID(),
      userId,
      name: dto.name,
      amount: dto.amount,
      expenseDate: dto.expenseDate,
    });

    await this.dailyExpenseRepository.save(expense);
    return expense;
  }
}
