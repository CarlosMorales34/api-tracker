import { FixedMonthlyExpense } from '../entities/fixed-monthly-expense.entity';

export interface FixedMonthlyExpenseRepository {
  save(expense: FixedMonthlyExpense): Promise<void>;
  update(expense: FixedMonthlyExpense): Promise<void>;
  findById(id: string): Promise<FixedMonthlyExpense | null>;
  findAllByUserId(userId: string): Promise<FixedMonthlyExpense[]>;
  deleteById(id: string): Promise<void>;
  sumByUserId(userId: string): Promise<number>;
}
