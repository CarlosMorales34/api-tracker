import { ActivityLog } from '../../../domain/entities/activity-log.entity';
import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';

export class ListActivityLogsUseCase {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async execute(userId: string, from: string, to: string): Promise<ActivityLog[]> {
    return this.activityLogRepository.findByUserAndDateRange(userId, from, to);
  }
}
