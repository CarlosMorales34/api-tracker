import { Activity } from '../../../domain/entities/activity.entity';
import { ActivityRepository } from '../../../domain/repositories/activity.repository';
import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class ListActivitiesUseCase {
  constructor(
    private readonly activityCategoryRepository: ActivityCategoryRepository,
    private readonly activityRepository: ActivityRepository,
  ) {}

  async execute(userId: string, categoryId?: string): Promise<Activity[]> {
    // Sin categoryId: todas las actividades de todas las categorías del
    // usuario (el repo filtra por user_id vía join contra activity_categories).
    if (!categoryId) {
      return this.activityRepository.findAllByUserId(userId);
    }

    // Con categoryId: verifica ownership antes de listar (404 si no es del usuario).
    const category = await this.activityCategoryRepository.findById(categoryId);
    if (!category || category.userId !== userId) {
      throw new NotFoundError('ActivityCategory', categoryId);
    }

    return this.activityRepository.findByCategoryId(categoryId);
  }
}
