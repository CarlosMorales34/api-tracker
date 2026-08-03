import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteActivityCategoryUseCase {
  constructor(private readonly activityCategoryRepository: ActivityCategoryRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const category = await this.activityCategoryRepository.findById(id);
    if (!category || category.userId !== userId) {
      throw new NotFoundError('ActivityCategory', id);
    }

    await this.activityCategoryRepository.deleteById(id);
  }
}
