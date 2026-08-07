import { WorkoutRoutineRepository } from '../../../domain/repositories/workout-routine.repository';

export class DeleteWorkoutRoutineUseCase {
  constructor(private readonly workoutRoutineRepository: WorkoutRoutineRepository) {}

  async execute(userId: string, routineId: string): Promise<void> {
    await this.workoutRoutineRepository.delete(userId, routineId);
  }
}
