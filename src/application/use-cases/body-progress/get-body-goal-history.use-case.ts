import { BodyGoal } from '../../../domain/entities/body-goal.entity';
import { BodyGoalRepository } from '../../../domain/repositories/body-goal.repository';

export class GetBodyGoalHistoryUseCase {
  constructor(private readonly bodyGoalRepository: BodyGoalRepository) {}

  async execute(userId: string): Promise<BodyGoal[]> {
    return this.bodyGoalRepository.findHistory(userId);
  }
}
