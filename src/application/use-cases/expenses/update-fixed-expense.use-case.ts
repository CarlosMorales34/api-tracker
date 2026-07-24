import { FixedMonthlyExpense } from '../../../domain/entities/fixed-monthly-expense.entity';
import { FixedMonthlyExpenseRepository } from '../../../domain/repositories/fixed-monthly-expense.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { UpdateFixedMonthlyExpenseDto } from '../../dtos/update-fixed-monthly-expense.dto';

export class UpdateFixedExpenseUseCase {
  constructor(private readonly fixedMonthlyExpenseRepository: FixedMonthlyExpenseRepository) {}

  async execute(userId: string, id: string, dto: UpdateFixedMonthlyExpenseDto): Promise<FixedMonthlyExpense> {
    const expense = await this.fixedMonthlyExpenseRepository.findById(id);
    if (!expense || expense.userId !== userId) {
      throw new NotFoundError('FixedMonthlyExpense', id);
    }

    expense.applyUpdate(dto);
    await this.fixedMonthlyExpenseRepository.update(expense);
    return expense;
  }
}
