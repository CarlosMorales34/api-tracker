import { Activity } from '../../../domain/entities/activity.entity';
import { ActivityLogRepository, ActivityLogTime } from '../../../domain/repositories/activity-log.repository';
import { ListActivitiesUseCase } from './list-activities.use-case';

export interface ActivityWithHours {
  activity: Activity;
  hours: number | null;
  times: ActivityLogTime[];
}

// Variante de ListActivitiesUseCase que además trae las horas capturadas
// (activity_logs) y el detalle de horarios (activity_log_times) para un día
// puntual, en un solo batch fetch por tabla en vez de una query por actividad.
export class ListActivitiesForDateUseCase {
  constructor(
    private readonly listActivitiesUseCase: ListActivitiesUseCase,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  async execute(userId: string, logDate: string, categoryId?: string): Promise<ActivityWithHours[]> {
    const activities = await this.listActivitiesUseCase.execute(userId, categoryId);
    const activityIds = activities.map((activity) => activity.id);
    const [hoursByActivity, timesByActivity] = await Promise.all([
      this.activityLogRepository.findHoursByActivityIdsAndDate(activityIds, logDate),
      this.activityLogRepository.findTimesByActivityIdsAndDate(activityIds, logDate),
    ]);

    return activities.map((activity) => ({
      activity,
      hours: hoursByActivity.get(activity.id) ?? null,
      times: timesByActivity.get(activity.id) ?? [],
    }));
  }
}
