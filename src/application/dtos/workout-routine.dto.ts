export interface WorkoutRoutineExerciseDto {
  name: string;
  targetSets: number;
  targetReps: number;
  suggestedWeight: number | null;
}

export interface CreateWorkoutRoutineDto {
  name: string;
  weekday: number | null;
  exercises: WorkoutRoutineExerciseDto[];
}

export type UpdateWorkoutRoutineDto = CreateWorkoutRoutineDto;
