import { UserTrainingSettings } from '../../../domain/entities/user-training-settings.entity';
import { UserTrainingSettingsRepository } from '../../../domain/repositories/user-training-settings.repository';
import { DomainError } from '../../../domain/errors/domain.error';

export interface UpdateTrainingSettingsDto {
  restWeekdays: number[];
}

export class UpdateTrainingSettingsUseCase {
  constructor(private readonly userTrainingSettingsRepository: UserTrainingSettingsRepository) {}

  async execute(userId: string, dto: UpdateTrainingSettingsDto): Promise<UserTrainingSettings> {
    const unique = [...new Set(dto.restWeekdays)];
    if (unique.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      throw new DomainError('restWeekdays debe contener días de 0 (domingo) a 6 (sábado)');
    }

    return this.userTrainingSettingsRepository.upsert(userId, { restWeekdays: unique });
  }
}
