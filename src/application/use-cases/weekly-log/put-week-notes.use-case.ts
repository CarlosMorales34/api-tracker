import { WeekNoteRepository } from '../../../domain/repositories/week-note.repository';
import { PutWeekNotesDto } from '../../dtos/put-week-notes.dto';

export class PutWeekNotesUseCase {
  constructor(private readonly weekNoteRepository: WeekNoteRepository) {}

  async execute(userId: string, year: number, weekNumber: number, dto: PutWeekNotesDto): Promise<{ notes: string }> {
    await this.weekNoteRepository.upsert(userId, year, weekNumber, dto.notes);
    return { notes: dto.notes };
  }
}
