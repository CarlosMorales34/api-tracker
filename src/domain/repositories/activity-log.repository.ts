import { ActivityLog, ActivityLogDetail } from '../entities/activity-log.entity';

export interface ActivityLogRepository {
  // GET /api/activity-logs — join contra activities->activity_categories
  // solo para filtrar por dueño (activity_logs no tiene user_id propio).
  findByUserAndDateRange(userId: string, from: string, to: string): Promise<ActivityLog[]>;
  // Registro Semanal necesita nombre de actividad y categoría (color incluido)
  // para categoryDistribution/topActivities — vista más rica que la anterior.
  findDetailedByUserAndDateRange(userId: string, from: string, to: string): Promise<ActivityLogDetail[]>;
  // hours null borra el registro de ese día (Actividades diarias).
  upsertHours(activityId: string, logDate: string, hours: number | null): Promise<void>;
  // Batch fetch para listar varias actividades con sus horas de un mismo día
  // en un solo viaje, en vez de una query por actividad.
  findHoursByActivityIdsAndDate(activityIds: string[], logDate: string): Promise<Map<string, number>>;
}
