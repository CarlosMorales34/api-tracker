import { WorkoutRoutine } from '../entities/workout-routine.entity';

export interface WorkoutRoutineExerciseInput {
  name: string;
  targetSets: number;
  targetReps: number;
  suggestedWeight: number | null;
}

export interface WorkoutRoutineInput {
  name: string;
  weekday: number | null;
  exercises: WorkoutRoutineExerciseInput[];
}

export interface WorkoutRoutineRepository {
  create(userId: string, input: WorkoutRoutineInput): Promise<WorkoutRoutine>;
  // null = la rutina no existe o no pertenece a userId.
  update(userId: string, routineId: string, input: WorkoutRoutineInput): Promise<WorkoutRoutine | null>;
  findAllByUserId(userId: string): Promise<WorkoutRoutine[]>;
  delete(userId: string, routineId: string): Promise<void>;
}
