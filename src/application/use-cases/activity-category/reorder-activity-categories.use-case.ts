import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { DomainError } from '../../../domain/errors/domain.error';

export class ReorderActivityCategoriesUseCase {
  constructor(private readonly activityCategoryRepository: ActivityCategoryRepository) {}

  async execute(userId: string, orderedIds: string[]): Promise<void> {
    const categories = await this.activityCategoryRepository.findAllByUserId(userId);
    const ownedIds = new Set(categories.map((category) => category.id));

    if (orderedIds.length !== ownedIds.size || !orderedIds.every((id) => ownedIds.has(id))) {
      throw new DomainError('orderedIds must contain exactly the ids of every category owned by the user');
    }

    await Promise.all(orderedIds.map((id, index) => this.activityCategoryRepository.updateSortOrder(id, index)));
  }
}
