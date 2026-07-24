import { WeightEntry } from '../../../domain/entities/weight-entry.entity';
import { WeightEntryRepository } from '../../../domain/repositories/weight-entry.repository';
import { PutWeightMonthNoteDto } from '../../dtos/put-weight-month-note.dto';

export class PutWeightMonthNoteUseCase {
  constructor(private readonly weightEntryRepository: WeightEntryRepository) {}

  async execute(userId: string, dto: PutWeightMonthNoteDto): Promise<WeightEntry> {
    await this.weightEntryRepository.upsertNote(userId, dto.year, dto.month, dto.note);
    const entry = await this.weightEntryRepository.findByUserYearMonth(userId, dto.year, dto.month);
    return entry ?? WeightEntry.empty(userId, dto.year, dto.month);
  }
}
