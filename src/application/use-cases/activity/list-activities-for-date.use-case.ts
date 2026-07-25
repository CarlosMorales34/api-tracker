import { Activity } from '../../../domain/entities/activity.entity';
import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { ListActivitiesUseCase } from './list-activities.use-case';

export interface ActivityWithHours {
  activity: Activity;
  hours: number | null;
}

// Variante de ListActivitiesUseCase que además trae las horas capturadas
// (activity_logs) para un día puntual, en un solo batch fetch en vez de una
// query por actividad.
export class ListActivitiesForDateUseCase {
  constructor(
    private readonly listActivitiesUseCase: ListActivitiesUseCase,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  async execute(userId: string, logDate: string, categoryId?: string): Promise<ActivityWithHours[]> {
    const activities = await this.listActivitiesUseCase.execute(userId, categoryId);
    const hoursByActivity = await this.activityLogRepository.findHoursByActivityIdsAndDate(
      activities.map((activity) => activity.id),
      logDate,
    );

    return activities.map((activity) => ({ activity, hours: hoursByActivity.get(activity.id) ?? null }));
  }
}
