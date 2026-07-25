import { FixedRoutine, FixedRoutineType } from '../../../domain/entities/fixed-routine.entity';
import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface UpdateFixedRoutineDto {
  name?: string;
  icon?: string;
  type?: FixedRoutineType;
}

export class UpdateFixedRoutineUseCase {
  constructor(private readonly fixedRoutineRepository: FixedRoutineRepository) {}

  async execute(userId: string, id: string, dto: UpdateFixedRoutineDto): Promise<FixedRoutine> {
    const routine = await this.fixedRoutineRepository.findById(id);
    if (!routine || routine.userId !== userId) {
      throw new NotFoundError('FixedRoutine', id);
    }

    routine.applyUpdate(dto);
    await this.fixedRoutineRepository.save(routine);
    return routine;
  }
}
