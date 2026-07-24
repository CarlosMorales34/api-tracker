import { randomUUID } from 'node:crypto';
import { ActivityCategory } from '../../../domain/entities/activity-category.entity';
import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { CreateActivityCategoryDto } from '../../dtos/create-activity-category.dto';

export class CreateActivityCategoryUseCase {
  constructor(private readonly activityCategoryRepository: ActivityCategoryRepository) {}

  async execute(userId: string, dto: CreateActivityCategoryDto): Promise<ActivityCategory> {
    // sort_order = siguiente entero disponible = cantidad de categorías que ya
    // tiene el usuario al momento de crear (ver README para la justificación).
    const sortOrder = await this.activityCategoryRepository.countByUserId(userId);
    const category = ActivityCategory.create({
      id: randomUUID(),
      userId,
      name: dto.name,
      color: dto.color,
      sortOrder,
    });

    await this.activityCategoryRepository.save(category);
    return category;
  }
}
