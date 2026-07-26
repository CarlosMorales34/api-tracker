import { WorkoutRepository } from '../../../domain/repositories/workout.repository';

const RECENT_SESSIONS_LIMIT = 12;
const RECENT_EXERCISES_LIMIT = 8;
const EXERCISE_HISTORY_LIMIT = 12;

export interface SessionVolumePoint {
  workoutDate: string;
  volume: number;
  exercises: { name: string; weight: number | null; sets: number; reps: number[] }[];
}

export interface ExercisePerformanceSeries {
  name: string;
  history: { workoutDate: string; weight: number | null; totalReps: number }[];
}

export interface WorkoutPerformance {
  sessions: SessionVolumePoint[];
  exercises: ExercisePerformanceSeries[];
}

// Rendimiento entre sesiones: (a) volumen total por sesión reciente, para ver
// la tendencia general, y (b) progresión por ejercicio (peso/reps a lo largo
// del tiempo) para los ejercicios más recientes del usuario.
export class GetWorkoutPerformanceUseCase {
  constructor(private readonly workoutRepository: WorkoutRepository) {}

  async execute(userId: string): Promise<WorkoutPerformance> {
    const recentWorkouts = await this.workoutRepository.findRecentByUser(userId, RECENT_SESSIONS_LIMIT);
    const sessions = [...recentWorkouts]
      .sort((a, b) => a.workoutDate.localeCompare(b.workoutDate))
      .map((w) => ({
        workoutDate: w.workoutDate,
        volume: w.totalVolume,
        exercises: w.exercises.map((ex) => ex.toJSON()),
      }));

    const exerciseNames = await this.workoutRepository.findDistinctExerciseNames(userId, RECENT_EXERCISES_LIMIT);
    const exercises = await Promise.all(
      exerciseNames.map(async (name) => ({
        name,
        history: await this.workoutRepository.findExerciseHistory(userId, name, EXERCISE_HISTORY_LIMIT),
      })),
    );

    return { sessions, exercises };
  }
}
