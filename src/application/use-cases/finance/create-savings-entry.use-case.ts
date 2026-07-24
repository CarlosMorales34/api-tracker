import { randomUUID } from 'node:crypto';
import { SavingsLogEntry } from '../../../domain/entities/savings-log-entry.entity';
import { FinanceSavingsRepository } from '../../../domain/repositories/finance-savings.repository';
import { CreateSavingsEntryDto } from '../../dtos/create-savings-entry.dto';

export class CreateSavingsEntryUseCase {
  constructor(private readonly savingsRepository: FinanceSavingsRepository) {}

  async execute(userId: string, dto: CreateSavingsEntryDto): Promise<SavingsLogEntry> {
    const entry: SavingsLogEntry = { id: randomUUID(), weekStartDate: dto.weekStartDate, amount: dto.amount };
    await this.savingsRepository.save({ ...entry, userId });
    return entry;
  }
}
