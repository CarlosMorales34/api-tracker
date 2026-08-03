import { ActivityRepository } from '../../../domain/repositories/activity.repository';
import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteActivityUseCase {
  constructor(
    private readonly activityCategoryRepository: ActivityCategoryRepository,
    private readonly activityRepository: ActivityRepository,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    const activity = await this.activityRepository.findById(id);
    if (!activity) {
      throw new NotFoundError('Activity', id);
    }

    // activities no tiene user_id propio -- la propiedad se valida vía su
    // categoría, mismo criterio que CreateActivityUseCase.
    const category = await this.activityCategoryRepository.findById(activity.categoryId);
    if (!category || category.userId !== userId) {
      throw new NotFoundError('Activity', id);
    }

    await this.activityRepository.deleteById(id);
  }
}
