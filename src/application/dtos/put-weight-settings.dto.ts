import { WeightGoalDirection } from '../../domain/entities/weight-settings.entity';

export interface PutWeightSettingsDto {
  goalKg: number;
  goalDirection: WeightGoalDirection;
}
