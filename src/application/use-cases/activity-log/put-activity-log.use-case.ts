import { ActivityRepository } from '../../../domain/repositories/activity.repository';
import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class PutActivityLogUseCase {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly activityCategoryRepository: ActivityCategoryRepository,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  async execute(userId: string, activityId: string, logDate: string, hours: number | null): Promise<number | null> {
    const activity = await this.activityRepository.findById(activityId);
    if (!activity) {
      throw new NotFoundError('Activity', activityId);
    }

    const category = await this.activityCategoryRepository.findById(activity.categoryId);
    if (!category || category.userId !== userId) {
      throw new NotFoundError('Activity', activityId);
    }

    await this.activityLogRepository.upsertHours(activityId, logDate, hours);
    return hours;
  }
}
