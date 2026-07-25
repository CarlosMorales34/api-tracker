import { ActivityRepository } from '../../../domain/repositories/activity.repository';
import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { DomainError, NotFoundError } from '../../../domain/errors/domain.error';

export class ReorderActivitiesUseCase {
  constructor(
    private readonly activityCategoryRepository: ActivityCategoryRepository,
    private readonly activityRepository: ActivityRepository,
  ) {}

  async execute(userId: string, categoryId: string, orderedIds: string[]): Promise<void> {
    const category = await this.activityCategoryRepository.findById(categoryId);
    if (!category || category.userId !== userId) {
      throw new NotFoundError('ActivityCategory', categoryId);
    }

    const activities = await this.activityRepository.findByCategoryId(categoryId);
    const ownedIds = new Set(activities.map((activity) => activity.id));

    if (orderedIds.length !== ownedIds.size || !orderedIds.every((id) => ownedIds.has(id))) {
      throw new DomainError('orderedIds must contain exactly the ids of every activity in that category');
    }

    await Promise.all(orderedIds.map((id, index) => this.activityRepository.updateSortOrder(id, index)));
  }
}
