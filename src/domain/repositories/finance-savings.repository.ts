import { SavingsLogEntry } from '../entities/savings-log-entry.entity';

export interface FinanceSavingsRepository {
  save(entry: SavingsLogEntry & { userId: string }): Promise<void>;
  sumByUser(userId: string): Promise<number>;
  sumByUserAndWeek(userId: string, weekStartDate: string): Promise<number>;
}
