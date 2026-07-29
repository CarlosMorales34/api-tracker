import { randomUUID } from 'node:crypto';
import { FixedRoutine } from '../../../domain/entities/fixed-routine.entity';
import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';
import { ActivityRepository } from '../../../domain/repositories/activity.repository';
import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { DomainError, NotFoundError } from '../../../domain/errors/domain.error';
import { CreateFixedRoutineDto } from '../../dtos/create-fixed-routine.dto';

export class CreateFixedRoutineUseCase {
  constructor(
    private readonly fixedRoutineRepository: FixedRoutineRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly activityCategoryRepository: ActivityCategoryRepository,
  ) {}

  async execute(userId: string, dto: CreateFixedRoutineDto): Promise<FixedRoutine> {
    if (dto.linkedActivityId) {
      // Un horario "single" (ej. Cena) no tiene hora de fin -> no hay
      // duración que reflejar en una actividad, así que no tiene sentido
      // vincularlo.
      if (dto.type === 'single') {
        throw new DomainError('Only "range" routines can be linked to an activity');
      }
      await this.assertActivityOwnedByUser(userId, dto.linkedActivityId);
    }

    const sortOrder = await this.fixedRoutineRepository.countByUserId(userId);
    const routine = FixedRoutine.create({
      id: randomUUID(),
      userId,
      name: dto.name,
      icon: dto.icon,
      type: dto.type,
      linkedActivityId: dto.linkedActivityId ?? null,
      sortOrder,
    });

    await this.fixedRoutineRepository.save(routine);
    return routine;
  }

  private async assertActivityOwnedByUser(userId: string, activityId: string): Promise<void> {
    const activity = await this.activityRepository.findById(activityId);
    if (!activity) {
      throw new NotFoundError('Activity', activityId);
    }
    const category = await this.activityCategoryRepository.findById(activity.categoryId);
    if (!category || category.userId !== userId) {
      throw new NotFoundError('Activity', activityId);
    }
  }
}
