import { MoneyEntry } from '../../../domain/entities/money-entry.entity';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { UpdateMoneyEntryDto } from '../../dtos/update-money-entry.dto';

export class UpdateMoneyEntryUseCase {
  constructor(
    private readonly moneyEntryRepository: MoneyEntryRepository,
    private readonly financeSettingsRepository: FinanceSettingsRepository,
  ) {}

  async execute(userId: string, id: string, dto: UpdateMoneyEntryDto): Promise<MoneyEntry> {
    const entry = await this.moneyEntryRepository.findById(id);
    if (!entry || entry.userId !== userId) {
      throw new NotFoundError('MoneyEntry', id);
    }

    const previousAmount = entry.amount;
    entry.applyUpdate(dto);
    await this.moneyEntryRepository.update(entry);

    if (entry.type === 'income' && dto.amount !== undefined && dto.amount !== previousAmount) {
      await this.financeSettingsRepository.adjustWalletBalance(userId, entry.amount - previousAmount);
    }
    return entry;
  }
}
