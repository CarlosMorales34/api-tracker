import { BodyGoal, BodyGoalType } from '../entities/body-goal.entity';

export interface CreateBodyGoalInput {
  goalType: BodyGoalType;
  startWeightKg: number;
  targetWeightKg: number | null;
  startDate: string;
  targetDate: string | null;
}

export interface BodyGoalRepository {
  findActive(userId: string): Promise<BodyGoal | null>;
  findHistory(userId: string): Promise<BodyGoal[]>;
  create(userId: string, input: CreateBodyGoalInput): Promise<BodyGoal>;
  deactivateActive(userId: string): Promise<void>;
}
