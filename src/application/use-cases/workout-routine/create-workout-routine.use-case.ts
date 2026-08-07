import { WorkoutRoutine } from '../../../domain/entities/workout-routine.entity';
import { WorkoutRoutineRepository } from '../../../domain/repositories/workout-routine.repository';
import { DomainError } from '../../../domain/errors/domain.error';
import { CreateWorkoutRoutineDto } from '../../dtos/workout-routine.dto';

export class CreateWorkoutRoutineUseCase {
  constructor(private readonly workoutRoutineRepository: WorkoutRoutineRepository) {}

  async execute(userId: string, dto: CreateWorkoutRoutineDto): Promise<WorkoutRoutine> {
    const validExercises = dto.exercises.filter((ex) => ex.name.trim().length > 0);
    if (validExercises.length === 0) {
      throw new DomainError('La rutina necesita al menos un ejercicio con nombre');
    }

    return this.workoutRoutineRepository.create(userId, {
      name: dto.name.trim(),
      weekday: dto.weekday,
      exercises: validExercises.map((ex) => ({
        name: ex.name.trim(),
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        suggestedWeight: ex.suggestedWeight,
      })),
    });
  }
}
