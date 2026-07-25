import { FinanceSettings } from '../../../domain/entities/finance-settings.entity';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';

export class SetWalletBalanceUseCase {
  constructor(private readonly financeSettingsRepository: FinanceSettingsRepository) {}

  async execute(userId: string, balance: number): Promise<FinanceSettings> {
    return this.financeSettingsRepository.setWalletBalance(userId, balance);
  }
}
