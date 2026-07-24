import { WeightEntry } from '../../../domain/entities/weight-entry.entity';
import { WeightEntryRepository } from '../../../domain/repositories/weight-entry.repository';
import { PutWeightMonthDto } from '../../dtos/put-weight-month.dto';

export class PutWeightMonthUseCase {
  constructor(private readonly weightEntryRepository: WeightEntryRepository) {}

  async execute(userId: string, dto: PutWeightMonthDto): Promise<WeightEntry> {
    await this.weightEntryRepository.upsertValue(userId, dto.year, dto.month, dto.value);
    const entry = await this.weightEntryRepository.findByUserYearMonth(userId, dto.year, dto.month);
    return entry ?? WeightEntry.empty(userId, dto.year, dto.month);
  }
}
