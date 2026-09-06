import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { ActivitySuggestionRepository } from '../../../domain/repositories/activity-suggestion.repository';
import { SuggestionFeedbackRepository } from '../../../domain/repositories/suggestion-feedback.repository';

export class DismissSuggestionUseCase {
  constructor(
    private readonly activitySuggestionRepository: ActivitySuggestionRepository,
    private readonly suggestionFeedbackRepository: SuggestionFeedbackRepository,
  ) {}

  async execute(userId: string, suggestionId: string): Promise<void> {
    const suggestion = await this.activitySuggestionRepository.findById(suggestionId);
    if (!suggestion || suggestion.userId !== userId) {
      throw new NotFoundError('ActivitySuggestion', suggestionId);
    }

    suggestion.markDismissed();
    await this.activitySuggestionRepository.updateStatus(suggestion.id, suggestion.status);

    await this.suggestionFeedbackRepository.save({
      id: randomUUID(),
      suggestionId: suggestion.id,
      userId,
      action: 'dismissed',
      originalValues: suggestion.suggestedValuesSnapshot(),
      finalValues: null,
      createdAt: new Date(),
    });
  }
}
