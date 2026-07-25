import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';
import { RoutineLogRepository, RoutineLogTime } from '../../../domain/repositories/routine-log.repository';
import { FixedRoutine } from '../../../domain/entities/fixed-routine.entity';

export interface FixedRoutineWithTimes {
  routine: FixedRoutine;
  times: RoutineLogTime[];
}

// Variante de ListFixedRoutinesUseCase que además trae los horarios
// capturados para un día puntual (routine_logs), en un solo batch fetch en
// vez de una query por rutina.
export class ListFixedRoutinesForDateUseCase {
  constructor(
    private readonly fixedRoutineRepository: FixedRoutineRepository,
    private readonly routineLogRepository: RoutineLogRepository,
  ) {}

  async execute(userId: string, logDate: string): Promise<FixedRoutineWithTimes[]> {
    const routines = await this.fixedRoutineRepository.findAllByUserId(userId);
    const timesByRoutine = await this.routineLogRepository.findTimesByRoutineIdsAndDate(
      routines.map((routine) => routine.id),
      logDate,
    );

    return routines.map((routine) => ({ routine, times: timesByRoutine.get(routine.id) ?? [] }));
  }
}
