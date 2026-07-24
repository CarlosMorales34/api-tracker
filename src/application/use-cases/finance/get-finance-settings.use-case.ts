import { DEFAULT_FINANCE_SETTINGS, FinanceSettings } from '../../../domain/entities/finance-settings.entity';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';

export class GetFinanceSettingsUseCase {
  constructor(private readonly financeSettingsRepository: FinanceSettingsRepository) {}

  async execute(userId: string): Promise<FinanceSettings> {
    return (await this.financeSettingsRepository.find(userId)) ?? DEFAULT_FINANCE_SETTINGS;
  }
}
