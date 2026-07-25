import { Workout } from '../../../domain/entities/workout.entity';
import { WorkoutRepository } from '../../../domain/repositories/workout.repository';
import { todayDateOnly } from '../../../shared/utils/week';
import { CreateWorkoutDto } from '../../dtos/create-workout.dto';
import { DomainError } from '../../../domain/errors/domain.error';

export class CreateWorkoutUseCase {
  constructor(private readonly workoutRepository: WorkoutRepository) {}

  async execute(userId: string, dto: CreateWorkoutDto): Promise<Workout> {
    const validExercises = dto.exercises.filter((ex) => ex.name.trim().length > 0);
    if (validExercises.length === 0) {
      throw new DomainError('El entrenamiento necesita al menos un ejercicio con nombre');
    }

    return this.workoutRepository.create(userId, {
      workoutDate: dto.workoutDate ?? todayDateOnly(),
      durationSeconds: dto.durationSeconds,
      comments: dto.comments && dto.comments.trim().length > 0 ? dto.comments.trim() : null,
      exercises: validExercises.map((ex) => ({
        name: ex.name.trim(),
        weight: ex.weight,
        sets: ex.sets,
        reps: ex.reps,
      })),
    });
  }
}
