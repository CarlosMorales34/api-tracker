import { FixedRoutine } from '../entities/fixed-routine.entity';

export interface FixedRoutineRepository {
  save(routine: FixedRoutine): Promise<void>;
  findById(id: string): Promise<FixedRoutine | null>;
  findAllByUserId(userId: string): Promise<FixedRoutine[]>;
  countByUserId(userId: string): Promise<number>;
  deleteById(id: string): Promise<void>;
}
