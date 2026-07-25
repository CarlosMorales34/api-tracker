import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteMoneyEntryUseCase {
  constructor(
    private readonly moneyEntryRepository: MoneyEntryRepository,
    private readonly financeSettingsRepository: FinanceSettingsRepository,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    const entry = await this.moneyEntryRepository.findById(id);
    if (!entry || entry.userId !== userId) {
      throw new NotFoundError('MoneyEntry', id);
    }

    await this.moneyEntryRepository.deleteById(id);
    if (entry.type === 'income') {
      await this.financeSettingsRepository.adjustWalletBalance(userId, -entry.amount);
    }
  }
}
