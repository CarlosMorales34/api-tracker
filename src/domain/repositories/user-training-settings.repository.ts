import { UserTrainingSettings } from '../entities/user-training-settings.entity';

export interface UserTrainingSettingsRepository {
  find(userId: string): Promise<UserTrainingSettings | null>;
  upsert(userId: string, settings: UserTrainingSettings): Promise<UserTrainingSettings>;
}
