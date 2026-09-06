import { DEFAULT_USER_SUGGESTION_SETTINGS, UserSuggestionSettings } from '../../../domain/entities/user-suggestion-settings.entity';
import { UserSuggestionSettingsRepository } from '../../../domain/repositories/user-suggestion-settings.repository';

export class GetSuggestionSettingsUseCase {
  constructor(private readonly userSuggestionSettingsRepository: UserSuggestionSettingsRepository) {}

  async execute(userId: string): Promise<UserSuggestionSettings> {
    return (await this.userSuggestionSettingsRepository.find(userId)) ?? DEFAULT_USER_SUGGESTION_SETTINGS;
  }
}
