import { FinanceAnnualIncome } from '../entities/finance-annual-income.entity';

export interface FinanceAnnualIncomeRepository {
  findAllByUserId(userId: string): Promise<FinanceAnnualIncome[]>;
  findByUserAndYear(userId: string, year: number): Promise<FinanceAnnualIncome | null>;
  findById(id: string): Promise<FinanceAnnualIncome | null>;
  // Upsert por (user_id, year) -- un usuario captura a lo más un total por año.
  upsert(entry: FinanceAnnualIncome): Promise<void>;
  deleteById(id: string): Promise<void>;
}
