import { Currency, FinanceSettings } from '../entities/finance-settings.entity';

export interface FinanceSettingsRepository {
  find(userId: string): Promise<FinanceSettings | null>;
  upsert(userId: string, changes: { debtTotal?: number; currency?: Currency }): Promise<FinanceSettings>;
}
