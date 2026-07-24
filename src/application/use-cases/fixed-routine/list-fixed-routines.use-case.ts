import { FixedRoutine } from '../../../domain/entities/fixed-routine.entity';
import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';

export class ListFixedRoutinesUseCase {
  constructor(private readonly fixedRoutineRepository: FixedRoutineRepository) {}

  async execute(userId: string): Promise<FixedRoutine[]> {
    return this.fixedRoutineRepository.findAllByUserId(userId);
  }
}
