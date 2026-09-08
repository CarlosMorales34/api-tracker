import { WorkoutRepository } from '../../../domain/repositories/workout.repository';
import { addDaysUTC, formatDateOnly, parseDateOnly, todayDateOnly } from '../../../shared/utils/week';

const STREAK_LOOKBACK_DAYS = 120;

export interface TrainingStreak {
  days: number;
  hasData: boolean;
}

// Racha de ENTRENAMIENTO -- distinta de la racha de Actividades que sale en
// el Home (esa cuenta días con algún activity_log; esta cuenta días con al
// menos un `workouts` registrado, sin importar si vino de una rutina
// (source_routine_id) o fue libre -- ambos cuentan igual como "sesión").
export class GetTrainingStreakUseCase {
  constructor(private readonly workoutRepository: WorkoutRepository) {}

  async execute(userId: string): Promise<TrainingStreak> {
    const today = todayDateOnly();
    const todayDate = parseDateOnly(today);
    const from = formatDateOnly(addDaysUTC(todayDate, -STREAK_LOOKBACK_DAYS));

    const dates = await this.workoutRepository.findDistinctDatesByUserInRange(userId, from, today);
    const daysWithWorkout = new Set(dates);

    let streak = 0;
    let cursor = todayDate;
    for (;;) {
      const cursorDateOnly = formatDateOnly(cursor);
      if (!daysWithWorkout.has(cursorDateOnly)) break;
      streak += 1;
      cursor = addDaysUTC(cursor, -1);
    }

    return { days: streak, hasData: streak > 0 };
  }
}
