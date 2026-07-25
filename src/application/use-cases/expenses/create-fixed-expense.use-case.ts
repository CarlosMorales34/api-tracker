import { randomUUID } from 'node:crypto';
import { FixedMonthlyExpense } from '../../../domain/entities/fixed-monthly-expense.entity';
import { FixedMonthlyExpenseRepository } from '../../../domain/repositories/fixed-monthly-expense.repository';
import { CreateFixedMonthlyExpenseDto } from '../../dtos/create-fixed-monthly-expense.dto';

export class CreateFixedExpenseUseCase {
  constructor(private readonly fixedMonthlyExpenseRepository: FixedMonthlyExpenseRepository) {}

  async execute(userId: string, dto: CreateFixedMonthlyExpenseDto): Promise<FixedMonthlyExpense> {
    const expense = FixedMonthlyExpense.create({
      id: randomUUID(),
      userId,
      name: dto.name,
      amount: dto.amount,
      dayOfMonth: dto.dayOfMonth,
      description: dto.description ?? null,
    });
    await this.fixedMonthlyExpenseRepository.save(expense);
    return expense;
  }
}
