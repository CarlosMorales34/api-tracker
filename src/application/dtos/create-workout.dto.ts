export interface CreateWorkoutExerciseDto {
  name: string;
  weight: number | null;
  sets: number;
  reps: number[];
}

export interface CreateWorkoutDto {
  workoutDate?: string;
  durationSeconds: number;
  comments: string | null;
  exercises: CreateWorkoutExerciseDto[];
}
