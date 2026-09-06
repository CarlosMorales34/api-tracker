import { UserModuleSettings } from '../../../domain/entities/user-module-settings.entity';
import { UserModuleSettingsRepository } from '../../../domain/repositories/user-module-settings.repository';
import { DomainError } from '../../../domain/errors/domain.error';

export interface UpdateUserModuleSettingsDto {
  hasActivities: boolean;
  hasFinance: boolean;
  hasHealth: boolean;
}

export class UpdateUserModuleSettingsUseCase {
  constructor(private readonly userModuleSettingsRepository: UserModuleSettingsRepository) {}

  async execute(userId: string, dto: UpdateUserModuleSettingsDto): Promise<UserModuleSettings> {
    if (!dto.hasActivities && !dto.hasFinance && !dto.hasHealth) {
      throw new DomainError('Debes tener al menos un dominio habilitado');
    }

    return this.userModuleSettingsRepository.upsert(userId, dto);
  }
}
