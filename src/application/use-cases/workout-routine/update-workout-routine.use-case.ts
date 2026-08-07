import { WorkoutRoutine } from '../../../domain/entities/workout-routine.entity';
import { WorkoutRoutineRepository } from '../../../domain/repositories/workout-routine.repository';
import { DomainError, NotFoundError } from '../../../domain/errors/domain.error';
import { UpdateWorkoutRoutineDto } from '../../dtos/workout-routine.dto';

export class UpdateWorkoutRoutineUseCase {
  constructor(private readonly workoutRoutineRepository: WorkoutRoutineRepository) {}

  async execute(userId: string, routineId: string, dto: UpdateWorkoutRoutineDto): Promise<WorkoutRoutine> {
    const validExercises = dto.exercises.filter((ex) => ex.name.trim().length > 0);
    if (validExercises.length === 0) {
      throw new DomainError('La rutina necesita al menos un ejercicio con nombre');
    }

    const updated = await this.workoutRoutineRepository.update(userId, routineId, {
      name: dto.name.trim(),
      weekday: dto.weekday,
      exercises: validExercises.map((ex) => ({
        name: ex.name.trim(),
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        suggestedWeight: ex.suggestedWeight,
      })),
    });

    if (!updated) {
      throw new NotFoundError('WorkoutRoutine', routineId);
    }
    return updated;
  }
}
