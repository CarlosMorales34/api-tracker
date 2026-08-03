import { DailyFeedbackRepository } from '../../../domain/repositories/daily-feedback.repository';
import { PutDailyFeedbackDto } from '../../dtos/put-daily-feedback.dto';

export class PutDailyFeedbackUseCase {
  constructor(private readonly dailyFeedbackRepository: DailyFeedbackRepository) {}

  async execute(userId: string, dto: PutDailyFeedbackDto): Promise<{ note: string }> {
    await this.dailyFeedbackRepository.upsert(userId, dto.date, dto.note);
    return { note: dto.note };
  }
}
