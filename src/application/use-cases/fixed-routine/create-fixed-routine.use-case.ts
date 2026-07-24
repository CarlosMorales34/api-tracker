import { randomUUID } from 'node:crypto';
import { FixedRoutine } from '../../../domain/entities/fixed-routine.entity';
import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';
import { CreateFixedRoutineDto } from '../../dtos/create-fixed-routine.dto';

export class CreateFixedRoutineUseCase {
  constructor(private readonly fixedRoutineRepository: FixedRoutineRepository) {}

  async execute(userId: string, dto: CreateFixedRoutineDto): Promise<FixedRoutine> {
    const sortOrder = await this.fixedRoutineRepository.countByUserId(userId);
    const routine = FixedRoutine.create({
      id: randomUUID(),
      userId,
      name: dto.name,
      icon: dto.icon,
      type: dto.type,
      sortOrder,
    });

    await this.fixedRoutineRepository.save(routine);
    return routine;
  }
}
