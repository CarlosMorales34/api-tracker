import { randomUUID } from 'node:crypto';
import { MoneyEntry } from '../../../domain/entities/money-entry.entity';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { CreateMoneyEntryDto } from '../../dtos/create-money-entry.dto';

export class CreateMoneyEntryUseCase {
  constructor(private readonly moneyEntryRepository: MoneyEntryRepository) {}

  async execute(userId: string, dto: CreateMoneyEntryDto): Promise<MoneyEntry> {
    const entry = MoneyEntry.create({
      id: randomUUID(),
      userId,
      type: dto.type,
      name: dto.name,
      amount: dto.amount,
      weekStartDate: dto.weekStartDate,
    });

    await this.moneyEntryRepository.save(entry);
    return entry;
  }
}
