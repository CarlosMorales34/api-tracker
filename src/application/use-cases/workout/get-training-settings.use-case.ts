import {
  DEFAULT_USER_TRAINING_SETTINGS,
  UserTrainingSettings,
} from '../../../domain/entities/user-training-settings.entity';
import { UserTrainingSettingsRepository } from '../../../domain/repositories/user-training-settings.repository';

export class GetTrainingSettingsUseCase {
  constructor(private readonly userTrainingSettingsRepository: UserTrainingSettingsRepository) {}

  async execute(userId: string): Promise<UserTrainingSettings> {
    const settings = await this.userTrainingSettingsRepository.find(userId);
    return settings ?? DEFAULT_USER_TRAINING_SETTINGS;
  }
}
