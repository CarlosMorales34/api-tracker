import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';
import { RoutineLogRepository, RoutineLogTime } from '../../../domain/repositories/routine-log.repository';
import { DomainError, NotFoundError } from '../../../domain/errors/domain.error';

export class PutRoutineLogUseCase {
  constructor(
    private readonly fixedRoutineRepository: FixedRoutineRepository,
    private readonly routineLogRepository: RoutineLogRepository,
  ) {}

  async execute(userId: string, routineId: string, logDate: string, times: RoutineLogTime[]): Promise<RoutineLogTime[]> {
    const routine = await this.fixedRoutineRepository.findById(routineId);
    if (!routine || routine.userId !== userId) {
      throw new NotFoundError('FixedRoutine', routineId);
    }

    if (routine.type === 'single' && times.length > 1) {
      throw new DomainError('A "single" routine accepts at most one time entry');
    }

    await this.routineLogRepository.upsert(routineId, logDate, times);
    return times;
  }
}
