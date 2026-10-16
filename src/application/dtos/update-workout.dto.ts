export interface UpdateWorkoutExerciseDto {
  exerciseId?: string | null;
  name: string;
  weight: number | null;
  isBodyweight?: boolean;
  sets: number;
  reps: number[];
}

export interface UpdateWorkoutDto {
  workoutDate: string;
  durationSeconds: number;
  comments: string | null;
  exercises: UpdateWorkoutExerciseDto[];
}
