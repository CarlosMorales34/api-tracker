import { WeightSettings } from '../../../domain/entities/weight-settings.entity';
import { WeightSettingsRepository } from '../../../domain/repositories/weight-settings.repository';
import { PutWeightSettingsDto } from '../../dtos/put-weight-settings.dto';

export class PutWeightSettingsUseCase {
  constructor(private readonly weightSettingsRepository: WeightSettingsRepository) {}

  async execute(userId: string, dto: PutWeightSettingsDto): Promise<WeightSettings> {
    return this.weightSettingsRepository.upsert(userId, dto.goalKg, dto.goalDirection);
  }
}
