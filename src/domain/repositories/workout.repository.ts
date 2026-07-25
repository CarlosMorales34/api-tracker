import { Workout } from '../entities/workout.entity';

export interface CreateWorkoutExerciseInput {
  name: string;
  weight: number | null;
  sets: number;
  reps: number[];
}

export interface CreateWorkoutInput {
  workoutDate: string;
  durationSeconds: number;
  comments: string | null;
  exercises: CreateWorkoutExerciseInput[];
}

// Punto de una serie temporal por ejercicio, para la gráfica de rendimiento
// entre sesiones (ver get-workout-performance.use-case.ts).
export interface ExercisePerformancePoint {
  workoutDate: string;
  weight: number | null;
  totalReps: number;
}

export interface WorkoutRepository {
  create(userId: string, input: CreateWorkoutInput): Promise<Workout>;
  findByUserAndDateRange(userId: string, from: string, to: string): Promise<Workout[]>;
  findRecentByUser(userId: string, limit: number): Promise<Workout[]>;
  delete(userId: string, workoutId: string): Promise<void>;
  // Nombres únicos de ejercicios ya registrados por el usuario, más recientes
  // primero -- alimenta el selector de la gráfica por ejercicio.
  findDistinctExerciseNames(userId: string, limit: number): Promise<string[]>;
  findExerciseHistory(userId: string, exerciseName: string, limit: number): Promise<ExercisePerformancePoint[]>;
}
