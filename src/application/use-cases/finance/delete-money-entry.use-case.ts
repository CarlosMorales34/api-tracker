import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteMoneyEntryUseCase {
  constructor(private readonly moneyEntryRepository: MoneyEntryRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const entry = await this.moneyEntryRepository.findById(id);
    if (!entry || entry.userId !== userId) {
      throw new NotFoundError('MoneyEntry', id);
    }

    await this.moneyEntryRepository.deleteById(id);
  }
}
