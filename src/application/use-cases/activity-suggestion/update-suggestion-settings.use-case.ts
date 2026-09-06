import { UserSuggestionSettings } from '../../../domain/entities/user-suggestion-settings.entity';
import { UserSuggestionSettingsRepository } from '../../../domain/repositories/user-suggestion-settings.repository';

export class UpdateSuggestionSettingsUseCase {
  constructor(private readonly userSuggestionSettingsRepository: UserSuggestionSettingsRepository) {}

  async execute(userId: string, settings: UserSuggestionSettings): Promise<UserSuggestionSettings> {
    return this.userSuggestionSettingsRepository.upsert(userId, settings);
  }
}
