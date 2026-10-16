export interface WorkoutRoutineExerciseDto {
  exerciseId?: string | null;
  name: string;
  targetSets: number;
  targetReps: number;
  suggestedWeight: number | null;
  isBodyweight?: boolean;
}

export interface CreateWorkoutRoutineDto {
  name: string;
  weekday: number | null;
  weekdays?: number[];
  exercises: WorkoutRoutineExerciseDto[];
}

export type UpdateWorkoutRoutineDto = CreateWorkoutRoutineDto;
