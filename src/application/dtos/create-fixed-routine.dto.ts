import { FixedRoutineType } from '../../domain/entities/fixed-routine.entity';

export interface CreateFixedRoutineDto {
  name: string;
  icon: string;
  type: FixedRoutineType;
  linkedActivityId?: string | null;
  isSleep?: boolean;
  weekdays?: number[] | null;
  startDate?: string | null;
  endDate?: string | null;
}
