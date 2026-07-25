import { WorkoutRepository } from '../../../domain/repositories/workout.repository';

export class DeleteWorkoutUseCase {
  constructor(private readonly workoutRepository: WorkoutRepository) {}

  async execute(userId: string, workoutId: string): Promise<void> {
    await this.workoutRepository.delete(userId, workoutId);
  }
}
