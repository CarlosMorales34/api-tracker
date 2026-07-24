import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteFixedRoutineUseCase {
  constructor(private readonly fixedRoutineRepository: FixedRoutineRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const routine = await this.fixedRoutineRepository.findById(id);
    if (!routine || routine.userId !== userId) {
      throw new NotFoundError('FixedRoutine', id);
    }

    await this.fixedRoutineRepository.deleteById(id);
  }
}
