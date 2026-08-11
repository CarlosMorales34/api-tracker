import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';
import { RoutineLogRepository } from '../../../domain/repositories/routine-log.repository';

export interface DailyProductivity {
  logDate: string;
  sleepHours: number;
  activityHours: number;
  targetHours: number;
  percent: number | null;
}

// Productividad del día = horas de actividades realizadas / (24 - horas de
// sueño). El sueño se resta de la base de 24h como dato estadístico (no
// cuenta ni a favor ni en contra más allá de reducir la "capacidad" del
// día), nunca como actividad realizada. Si la(s) rutina(s) de sueño están
// vinculadas a una actividad (linked_activity_id), su horario reflejado ahí
// se EXCLUYE de activityHours -- si no, ese bloque se restaría dos veces
// (una como sueño, otra como si fuera "actividad productiva").
export class GetDailyProductivityUseCase {
  constructor(
    private readonly fixedRoutineRepository: FixedRoutineRepository,
    private readonly routineLogRepository: RoutineLogRepository,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  async execute(userId: string, logDate: string): Promise<DailyProductivity> {
    const routines = await this.fixedRoutineRepository.findAllByUserId(userId);
    const sleepRoutineIds = routines.filter((routine) => routine.isSleep).map((routine) => routine.id);

    let sleepHours = 0;
    if (sleepRoutineIds.length > 0) {
      const timesByRoutine = await this.routineLogRepository.findTimesByRoutineIdsAndDate(sleepRoutineIds, logDate);
      for (const times of timesByRoutine.values()) {
        for (const time of times) {
          if (!time.end) continue;
          sleepHours += overnightDurationHours(time.start, time.end);
        }
      }
    }
    sleepHours = round2(sleepHours);

    const activityHours = await this.activityLogRepository.sumHoursExcludingRoutines(userId, logDate, sleepRoutineIds);

    const targetHours = round2(Math.max(0, 24 - sleepHours));
    const percent = targetHours > 0 ? Math.min(100, Math.round((activityHours / targetHours) * 100)) : null;

    return { logDate, sleepHours, activityHours, targetHours, percent };
  }
}

// A diferencia de las horas de actividad (siempre dentro del mismo día), el
// sueño típicamente cruza medianoche (ej. 23:00 -> 07:00) -- si end <= start
// se asume que cruzó a las 24h en vez de descartarlo.
function overnightDurationHours(start: string, end: string): number {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
  let endMinutes = (endH ?? 0) * 60 + (endM ?? 0);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
