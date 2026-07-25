import { Activity } from '../entities/activity.entity';

export interface ActivityRepository {
  save(activity: Activity): Promise<void>;
  findById(id: string): Promise<Activity | null>;
  findByCategoryId(categoryId: string): Promise<Activity[]>;
  findAllByUserId(userId: string): Promise<Activity[]>;
  countByCategoryId(categoryId: string): Promise<number>;
  updateSortOrder(id: string, sortOrder: number): Promise<void>;
}
