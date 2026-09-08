import { Workout } from '../entities/workout.entity';

export interface CreateWorkoutExerciseInput {
  name: string;
  weight: number | null;
  isBodyweight: boolean;
  sets: number;
  reps: number[];
}

export interface CreateWorkoutInput {
  workoutDate: string;
  sourceRoutineId: string | null;
  durationSeconds: number;
  comments: string | null;
  exercises: CreateWorkoutExerciseInput[];
}

// sourceRoutineId se fija solo al crear (de qué rutina se originó, si
// aplica) -- editar un entrenamiento nunca cambia ese origen.
export type UpdateWorkoutInput = Omit<CreateWorkoutInput, 'sourceRoutineId'>;

// Punto de una serie temporal por ejercicio, para la gráfica de rendimiento
// entre sesiones (ver get-workout-performance.use-case.ts).
export interface ExercisePerformancePoint {
  workoutDate: string;
  sourceRoutineId: string | null;
  weight: number | null;
  totalReps: number;
}

export interface WorkoutRepository {
  create(userId: string, input: CreateWorkoutInput): Promise<Workout>;
  // null = el workout no existe o no pertenece a userId (ownership check
  // vive en la query misma, WHERE id = ? AND user_id = ?).
  update(userId: string, workoutId: string, input: UpdateWorkoutInput): Promise<Workout | null>;
  findByUserAndDateRange(userId: string, from: string, to: string): Promise<Workout[]>;
  // Solo las fechas (sin ejercicios) en el rango -- para la racha de
  // entrenamiento, más liviano que traer sesiones completas para una
  // ventana de varios meses.
  findDistinctDatesByUserInRange(userId: string, from: string, to: string): Promise<string[]>;
  findRecentByUser(userId: string, limit: number): Promise<Workout[]>;
  delete(userId: string, workoutId: string): Promise<void>;
  // Nombres únicos de ejercicios ya registrados por el usuario, más recientes
  // primero -- alimenta el selector de la gráfica por ejercicio.
  findDistinctExerciseNames(userId: string, limit: number): Promise<string[]>;
  findExerciseHistory(userId: string, exerciseName: string, limit: number): Promise<ExercisePerformancePoint[]>;
}
