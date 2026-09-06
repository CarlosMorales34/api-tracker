import { DEFAULT_USER_MODULE_SETTINGS, UserModuleSettings } from '../../../domain/entities/user-module-settings.entity';
import { UserModuleSettingsRepository } from '../../../domain/repositories/user-module-settings.repository';

export class GetUserModuleSettingsUseCase {
  constructor(private readonly userModuleSettingsRepository: UserModuleSettingsRepository) {}

  async execute(userId: string): Promise<UserModuleSettings> {
    const settings = await this.userModuleSettingsRepository.find(userId);
    return settings ?? DEFAULT_USER_MODULE_SETTINGS;
  }
}
