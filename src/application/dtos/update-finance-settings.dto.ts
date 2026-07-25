import { Currency } from '../../domain/entities/finance-settings.entity';

export interface UpdateFinanceSettingsDto {
  debtTotal?: number;
  currency?: Currency;
  week1AnchorDate?: string | null;
}
