import { FixedRoutine, FixedRoutineType } from '../../../domain/entities/fixed-routine.entity';
import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';
import { ActivityRepository } from '../../../domain/repositories/activity.repository';
import { ActivityCategoryRepository } from '../../../domain/repositories/activity-category.repository';
import { DomainError, NotFoundError } from '../../../domain/errors/domain.error';

export interface UpdateFixedRoutineDto {
  name?: string;
  icon?: string;
  type?: FixedRoutineType;
  linkedActivityId?: string | null;
}

export class UpdateFixedRoutineUseCase {
  constructor(
    private readonly fixedRoutineRepository: FixedRoutineRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly activityCategoryRepository: ActivityCategoryRepository,
  ) {}

  async execute(userId: string, id: string, dto: UpdateFixedRoutineDto): Promise<FixedRoutine> {
    const routine = await this.fixedRoutineRepository.findById(id);
    if (!routine || routine.userId !== userId) {
      throw new NotFoundError('FixedRoutine', id);
    }

    const resultingType = dto.type ?? routine.type;
    const resultingLinkedActivityId = dto.linkedActivityId !== undefined ? dto.linkedActivityId : routine.linkedActivityId;
    // Un horario "single" (ej. Cena) no tiene hora de fin -> no hay duración
    // que reflejar en una actividad, así que no tiene sentido vincularlo.
    if (resultingType === 'single' && resultingLinkedActivityId) {
      throw new DomainError('Only "range" routines can be linked to an activity');
    }
    if (dto.linkedActivityId) {
      await this.assertActivityOwnedByUser(userId, dto.linkedActivityId);
    }

    routine.applyUpdate(dto);
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
