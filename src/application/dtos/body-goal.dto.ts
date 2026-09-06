import { BodyGoalType } from '../../domain/entities/body-goal.entity';

export interface SetBodyGoalDto {
  goalType: BodyGoalType;
  startWeightKg: number;
  targetWeightKg?: number | null;
  startDate: string;
  targetDate?: string | null;
}
