import { ActivitySuggestionRepository } from '../../../domain/repositories/activity-suggestion.repository';
import { SuggestionFeedbackRepository } from '../../../domain/repositories/suggestion-feedback.repository';

// "El usuario debe poder borrar su historial de sugerencias" -- borra tanto
// las propuestas (pendientes o ya decididas) como el feedback derivado.
export class ClearSuggestionHistoryUseCase {
  constructor(
    private readonly activitySuggestionRepository: ActivitySuggestionRepository,
    private readonly suggestionFeedbackRepository: SuggestionFeedbackRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.suggestionFeedbackRepository.deleteAllByUser(userId);
    await this.activitySuggestionRepository.deleteAllByUser(userId);
  }
}
