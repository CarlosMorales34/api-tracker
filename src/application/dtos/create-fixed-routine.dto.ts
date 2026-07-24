import { FixedRoutineType } from '../../domain/entities/fixed-routine.entity';

export interface CreateFixedRoutineDto {
  name: string;
  icon: string;
  type: FixedRoutineType;
}
