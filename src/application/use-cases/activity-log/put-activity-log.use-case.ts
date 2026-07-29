import { ActivityRepository } from '../../../domain/repositories/activity.repository';
import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { ActivityLogRepository, ActivityLogTime } from '../../../domain/repositories/activity-log.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface PutActivityLogResult {
  hours: number | null;
  times: ActivityLogTime[];
}

export class PutActivityLogUseCase {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly activityCategoryRepository: ActivityCategoryRepository,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  async execute(
    userId: string,
    activityId: string,
    logDate: string,
    times: { start: string; end: string }[],
  ): Promise<PutActivityLogResult> {
    const activity = await this.activityRepository.findById(activityId);
    if (!activity) {
      throw new NotFoundError('Activity', activityId);
    }

    const category = await this.activityCategoryRepository.findById(activity.categoryId);
    if (!category || category.userId !== userId) {
      throw new NotFoundError('Activity', activityId);
    }

    await this.activityLogRepository.upsertManualTimes(activityId, logDate, times);

    // Se relee después de guardar (en vez de armar la respuesta a mano) para
    // devolver el total ya recalculado y el detalle completo del día,
    // incluyendo entradas reflejadas de una rutina vinculada si las hay.
    const [hoursByActivity, timesByActivity] = await Promise.all([
      this.activityLogRepository.findHoursByActivityIdsAndDate([activityId], logDate),
      this.activityLogRepository.findTimesByActivityIdsAndDate([activityId], logDate),
    ]);

    return {
      hours: hoursByActivity.get(activityId) ?? null,
      times: timesByActivity.get(activityId) ?? [],
    };
  }
}
