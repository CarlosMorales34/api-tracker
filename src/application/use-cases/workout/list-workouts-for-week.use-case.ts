import { Workout } from '../../../domain/entities/workout.entity';
import { WorkoutRepository } from '../../../domain/repositories/workout.repository';
import { formatDateOnly, addDaysUTC, parseDateOnly } from '../../../shared/utils/week';

export class ListWorkoutsForWeekUseCase {
  constructor(private readonly workoutRepository: WorkoutRepository) {}

  async execute(userId: string, weekStartDate: string): Promise<Workout[]> {
    const weekEnd = formatDateOnly(addDaysUTC(parseDateOnly(weekStartDate), 6));
    return this.workoutRepository.findByUserAndDateRange(userId, weekStartDate, weekEnd);
  }
}
