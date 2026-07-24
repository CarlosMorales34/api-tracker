import { randomUUID } from 'node:crypto';
import { Activity } from '../../../domain/entities/activity.entity';
import { ActivityRepository } from '../../../domain/repositories/activity.repository';
import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { CreateActivityDto } from '../../dtos/create-activity.dto';

export class CreateActivityUseCase {
  constructor(
    private readonly activityCategoryRepository: ActivityCategoryRepository,
    private readonly activityRepository: ActivityRepository,
  ) {}

  async execute(userId: string, dto: CreateActivityDto): Promise<Activity> {
    const category = await this.activityCategoryRepository.findById(dto.categoryId);
    // 404 (no 403) cuando la categoría no es del usuario — mismo criterio que
    // LogMetricEntryUseCase, para no filtrar si el id existe pero es ajeno.
    if (!category || category.userId !== userId) {
      throw new NotFoundError('ActivityCategory', dto.categoryId);
    }

    const sortOrder = await this.activityRepository.countByCategoryId(dto.categoryId);
    const activity = Activity.create({
      id: randomUUID(),
      categoryId: dto.categoryId,
      name: dto.name,
      sortOrder,
    });

    await this.activityRepository.save(activity);
    return activity;
  }
}
