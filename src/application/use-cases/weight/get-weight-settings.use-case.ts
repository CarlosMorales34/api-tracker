import { DEFAULT_WEIGHT_SETTINGS, WeightSettings } from '../../../domain/entities/weight-settings.entity';
import { WeightSettingsRepository } from '../../../domain/repositories/weight-settings.repository';

export class GetWeightSettingsUseCase {
  constructor(private readonly weightSettingsRepository: WeightSettingsRepository) {}

  async execute(userId: string): Promise<WeightSettings> {
    return (await this.weightSettingsRepository.find(userId)) ?? DEFAULT_WEIGHT_SETTINGS;
  }
}
