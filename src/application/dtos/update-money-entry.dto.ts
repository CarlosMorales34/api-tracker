import { MoneyEntryRecurrence } from '../../domain/entities/money-entry.entity';

export interface UpdateMoneyEntryDto {
  name?: string;
  amount?: number;
  recurrence?: MoneyEntryRecurrence;
}
