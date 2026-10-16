export interface CreateWorkoutExerciseDto {
  exerciseId?: string | null;
  name: string;
  weight: number | null;
  isBodyweight?: boolean;
  sets: number;
  reps: number[];
}

export interface CreateWorkoutDto {
  workoutDate?: string;
  sourceRoutineId?: string | null;
  durationSeconds: number;
  comments: string | null;
  exercises: CreateWorkoutExerciseDto[];
}
