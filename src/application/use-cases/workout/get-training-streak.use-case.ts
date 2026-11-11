import { UserTrainingSettingsRepository } from '../../../domain/repositories/user-training-settings.repository';
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
//
// Los días de la semana que el usuario marcó como descanso (ver
// UserTrainingSettings) NO rompen la racha aunque no haya workout ese día --
// tampoco suman al conteo, solo se saltan. Un día pasado sin entrenar y sin
// descanso corta la racha. Hoy aún puede registrarse y no la corta.
export class GetTrainingStreakUseCase {
  constructor(
    private readonly workoutRepository: WorkoutRepository,
    private readonly userTrainingSettingsRepository: UserTrainingSettingsRepository,
  ) {}

  async execute(userId: string): Promise<TrainingStreak> {
    const today = todayDateOnly();
    const todayDate = parseDateOnly(today);
    const from = formatDateOnly(addDaysUTC(todayDate, -STREAK_LOOKBACK_DAYS));

    const [dates, settings] = await Promise.all([
      this.workoutRepository.findDistinctDatesByUserInRange(userId, from, today),
      this.userTrainingSettingsRepository.find(userId),
    ]);
    const daysWithWorkout = new Set(dates);
    const restWeekdays = new Set(settings?.restWeekdays ?? []);

    let streak = 0;
    // Only scan the inclusive interval covered by the repository query.
    for (let daysAgo = 0; daysAgo <= STREAK_LOOKBACK_DAYS; daysAgo++) {
      const cursor = addDaysUTC(todayDate, -daysAgo);
      if (daysWithWorkout.has(formatDateOnly(cursor))) {
        streak += 1;
      } else if (daysAgo > 0 && !restWeekdays.has(cursor.getUTCDay())) {
        break;
      }
    }

    return { days: streak, hasData: streak > 0 };
  }
}
