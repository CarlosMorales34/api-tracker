import { MoneyEntryType } from '../../domain/entities/money-entry.entity';

export interface CreateMoneyEntryDto {
  type: MoneyEntryType;
  name: string;
  amount: number;
  weekStartDate: string;
}
