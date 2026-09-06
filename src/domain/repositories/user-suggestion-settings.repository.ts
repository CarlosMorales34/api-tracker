import { UserSuggestionSettings } from '../entities/user-suggestion-settings.entity';

export interface UserSuggestionSettingsRepository {
  find(userId: string): Promise<UserSuggestionSettings | null>;
  upsert(userId: string, settings: UserSuggestionSettings): Promise<UserSuggestionSettings>;
}
