import { ActivityCategory } from '../../../domain/entities/activity-category.entity';
import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';

export class ListActivityCategoriesUseCase {
  constructor(private readonly activityCategoryRepository: ActivityCategoryRepository) {}

  async execute(userId: string): Promise<ActivityCategory[]> {
    return this.activityCategoryRepository.findAllByUserId(userId);
  }
}
