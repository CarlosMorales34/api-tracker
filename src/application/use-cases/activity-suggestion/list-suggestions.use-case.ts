import { ActivitySuggestion } from '../../../domain/entities/activity-suggestion.entity';
import { ActivitySuggestionRepository } from '../../../domain/repositories/activity-suggestion.repository';

export class ListSuggestionsUseCase {
  constructor(private readonly activitySuggestionRepository: ActivitySuggestionRepository) {}

  async execute(userId: string): Promise<ActivitySuggestion[]> {
    return this.activitySuggestionRepository.findPendingByUser(userId);
  }
}
