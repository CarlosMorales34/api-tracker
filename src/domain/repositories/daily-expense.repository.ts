import { DailyExpense } from '../entities/daily-expense.entity';

export interface DailyExpenseRepository {
  save(expense: DailyExpense): Promise<void>;
  update(expense: DailyExpense): Promise<void>;
  findById(id: string): Promise<DailyExpense | null>;
  findByUserAndDate(userId: string, date: string): Promise<DailyExpense[]>;
  deleteById(id: string): Promise<void>;
  sumByUserAndMonth(userId: string, year: number, month: number): Promise<number>;
  sumByUserAndDateRange(userId: string, from: string, to: string): Promise<number>;
}
