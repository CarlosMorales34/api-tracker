import { ActivityCategory } from '../entities/activity-category.entity';

export interface ActivityCategoryRepository {
  save(category: ActivityCategory): Promise<void>;
  findById(id: string): Promise<ActivityCategory | null>;
  findAllByUserId(userId: string): Promise<ActivityCategory[]>;
  countByUserId(userId: string): Promise<number>;
}
