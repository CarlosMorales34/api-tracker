import { MonthlyBudget } from '../entities/monthly-budget.entity';

export interface MonthlyBudgetRepository {
  findByUserYearMonth(userId: string, year: number, month: number): Promise<MonthlyBudget | null>;
  // No reescribe meses pasados -- cada año+mes es su propia fila (UNIQUE).
  upsert(userId: string, budget: MonthlyBudget): Promise<MonthlyBudget>;
}
