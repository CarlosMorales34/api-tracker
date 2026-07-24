import { WeightGoalDirection, WeightSettings } from '../entities/weight-settings.entity';

export interface WeightSettingsRepository {
  find(userId: string): Promise<WeightSettings | null>;
  upsert(userId: string, goalKg: number, goalDirection: WeightGoalDirection): Promise<WeightSettings>;
}
