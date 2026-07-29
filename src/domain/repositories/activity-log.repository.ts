import { ActivityLog, ActivityLogDetail } from '../entities/activity-log.entity';

export type ActivityLogTimeSource = 'manual' | 'routine';

export interface ActivityLogTime {
  start: string;
  end: string;
  source: ActivityLogTimeSource;
  // Nombre de la rutina fija que originó esta entrada (solo si source='routine')
  // -- se usa para etiquetarla en el front, ya que ese bloque es de solo
  // lectura ahí (se edita desde la rutina, no desde la actividad).
  routineName: string | null;
}

export interface ActivityLogRepository {
  // GET /api/activity-logs — join contra activities->activity_categories
  // solo para filtrar por dueño (activity_logs no tiene user_id propio).
  findByUserAndDateRange(userId: string, from: string, to: string): Promise<ActivityLog[]>;
  // Registro Semanal necesita nombre de actividad y categoría (color incluido)
  // para categoryDistribution/topActivities — vista más rica que la anterior.
  findDetailedByUserAndDateRange(userId: string, from: string, to: string): Promise<ActivityLogDetail[]>;
  // Batch fetch para listar varias actividades con sus horas totales de un
  // mismo día en un solo viaje, en vez de una query por actividad.
  findHoursByActivityIdsAndDate(activityIds: string[], logDate: string): Promise<Map<string, number>>;
  // Batch fetch de los rangos de hora (manuales + reflejados de rutina) de
  // varias actividades en un mismo día.
  findTimesByActivityIdsAndDate(activityIds: string[], logDate: string): Promise<Map<string, ActivityLogTime[]>>;
  // Reemplaza únicamente las entradas source='manual' de esa actividad+día
  // por `times` (deja intactas las reflejadas de una rutina vinculada), y
  // recalcula activity_logs.hours como la suma de TODAS las entradas
  // (manuales + de rutina). times vacío borra las entradas manuales de ese
  // día -- si tampoco quedan entradas de rutina, borra el activity_log.
  upsertManualTimes(activityId: string, logDate: string, times: { start: string; end: string }[]): Promise<void>;
  // Reemplaza las entradas source='routine' de esa actividad+día que vienen
  // de `routineId` (deja intactas las manuales y las de otras rutinas), y
  // recalcula activity_logs.hours. times vacío borra el reflejo de esa
  // rutina para ese día.
  syncRoutineTimes(
    activityId: string,
    logDate: string,
    routineId: string,
    times: { start: string; end: string }[],
  ): Promise<void>;
}
