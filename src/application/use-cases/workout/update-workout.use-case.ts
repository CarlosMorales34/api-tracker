import { Workout } from '../../../domain/entities/workout.entity';
import { WorkoutRepository } from '../../../domain/repositories/workout.repository';
import { DomainError, NotFoundError } from '../../../domain/errors/domain.error';
import { UpdateWorkoutDto } from '../../dtos/update-workout.dto';

export class UpdateWorkoutUseCase {
  constructor(private readonly workoutRepository: WorkoutRepository) {}

  async execute(userId: string, workoutId: string, dto: UpdateWorkoutDto): Promise<Workout> {
    const validExercises = dto.exercises.filter((ex) => ex.name.trim().length > 0);
    if (validExercises.length === 0) {
      throw new DomainError('El entrenamiento necesita al menos un ejercicio con nombre');
    }

    const updated = await this.workoutRepository.update(userId, workoutId, {
      workoutDate: dto.workoutDate,
      durationSeconds: dto.durationSeconds,
      comments: dto.comments && dto.comments.trim().length > 0 ? dto.comments.trim() : null,
      exercises: validExercises.map((ex) => ({
        name: ex.name.trim(),
        weight: ex.weight,
        sets: ex.sets,
        reps: ex.reps,
      })),
    });

    if (!updated) {
      throw new NotFoundError('Workout', workoutId);
    }
    return updated;
  }
}
