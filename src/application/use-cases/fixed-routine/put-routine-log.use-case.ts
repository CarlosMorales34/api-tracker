import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';
import { RoutineLogRepository, RoutineLogTime } from '../../../domain/repositories/routine-log.repository';
import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { DomainError, NotFoundError } from '../../../domain/errors/domain.error';

export class PutRoutineLogUseCase {
  constructor(
    private readonly fixedRoutineRepository: FixedRoutineRepository,
    private readonly routineLogRepository: RoutineLogRepository,
    private readonly activityLogRepository: ActivityLogRepository,
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

    if (routine.linkedActivityId) {
      // Solo los turnos con hora de fin tienen una duración que reflejar --
      // un turno "single" (sin fin) no aporta horas a la actividad vinculada.
      const rangeTimes = times
        .filter((time): time is { start: string; end: string } => Boolean(time.end))
        .map((time) => ({ start: time.start, end: time.end! }));
      await this.activityLogRepository.syncRoutineTimes(routine.linkedActivityId, logDate, routineId, rangeTimes);
    }

    return times;
  }
}
