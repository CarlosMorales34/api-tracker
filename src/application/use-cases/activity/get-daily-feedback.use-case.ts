import { DailyFeedbackRepository } from '../../../domain/repositories/daily-feedback.repository';

export class GetDailyFeedbackUseCase {
  constructor(private readonly dailyFeedbackRepository: DailyFeedbackRepository) {}

  async execute(userId: string, logDate: string): Promise<{ note: string }> {
    const note = await this.dailyFeedbackRepository.find(userId, logDate);
    return { note: note ?? '' };
  }
}
