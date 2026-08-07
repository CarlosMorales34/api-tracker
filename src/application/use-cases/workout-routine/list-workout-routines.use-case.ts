import { WorkoutRoutine } from '../../../domain/entities/workout-routine.entity';
import { WorkoutRoutineRepository } from '../../../domain/repositories/workout-routine.repository';

export class ListWorkoutRoutinesUseCase {
  constructor(private readonly workoutRoutineRepository: WorkoutRoutineRepository) {}

  async execute(userId: string): Promise<WorkoutRoutine[]> {
    return this.workoutRoutineRepository.findAllByUserId(userId);
  }
}
