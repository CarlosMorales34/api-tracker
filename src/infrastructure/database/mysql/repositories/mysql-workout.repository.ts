import { randomUUID } from 'node:crypto';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { Workout, WorkoutExercise } from '../../../../domain/entities/workout.entity';
import {
  CreateWorkoutInput,
  ExercisePerformancePoint,
  WorkoutRepository,
} from '../../../../domain/repositories/workout.repository';

interface WorkoutRow extends RowDataPacket {
  id: string;
  user_id: string;
  workout_date: string;
  duration_seconds: number;
  comments: string | null;
}

interface WorkoutExerciseRow extends RowDataPacket {
  id: string;
  workout_id: string;
  name: string;
  weight: number | null;
  sets: number;
  // MariaDB's JSON type is a LONGTEXT alias (no native JSON wire type), so
  // mysql2 returns it as a raw string instead of auto-parsing. Real MySQL
  // (and newer MariaDB with true JSON support) auto-parses it into a real
  // array instead. Engine-dependent, so this must tolerate both shapes --
  // see parseReps below.
  reps: string | number[];
  sort_order: number;
}

function parseReps(value: string | number[]): number[] {
  return Array.isArray(value) ? value : (JSON.parse(value) as number[]);
}

export class MysqlWorkoutRepository implements WorkoutRepository {
  constructor(private readonly pool: Pool) {}

  async create(userId: string, input: CreateWorkoutInput): Promise<Workout> {
    const workoutId = randomUUID();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `INSERT INTO workouts (id, user_id, workout_date, duration_seconds, comments)
         VALUES (?, ?, ?, ?, ?)`,
        [workoutId, userId, input.workoutDate, input.durationSeconds, input.comments],
      );
      for (const [index, exercise] of input.exercises.entries()) {
        await connection.query(
          `INSERT INTO workout_exercises (id, workout_id, name, weight, sets, reps, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [randomUUID(), workoutId, exercise.name, exercise.weight, exercise.sets, JSON.stringify(exercise.reps), index],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const created = await this.findById(userId, workoutId);
    if (!created) throw new Error('Workout was created but could not be re-read');
    return created;
  }

  async findByUserAndDateRange(userId: string, from: string, to: string): Promise<Workout[]> {
    const [rows] = await this.pool.query<WorkoutRow[]>(
      `SELECT id, user_id, workout_date, duration_seconds, comments FROM workouts
       WHERE user_id = ? AND workout_date BETWEEN ? AND ?
       ORDER BY workout_date DESC, created_at DESC`,
      [userId, from, to],
    );
    return this.hydrate(rows);
  }

  async findRecentByUser(userId: string, limit: number): Promise<Workout[]> {
    const [rows] = await this.pool.query<WorkoutRow[]>(
      `SELECT id, user_id, workout_date, duration_seconds, comments FROM workouts
       WHERE user_id = ?
       ORDER BY workout_date DESC, created_at DESC
       LIMIT ?`,
      [userId, limit],
    );
    return this.hydrate(rows);
  }

  async delete(userId: string, workoutId: string): Promise<void> {
    await this.pool.query('DELETE FROM workouts WHERE id = ? AND user_id = ?', [workoutId, userId]);
  }

  async findDistinctExerciseNames(userId: string, limit: number): Promise<string[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT we.name AS name, MAX(w.workout_date) AS last_date
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = ?
       GROUP BY we.name
       ORDER BY last_date DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows.map((row) => row.name as string);
  }

  async findExerciseHistory(userId: string, exerciseName: string, limit: number): Promise<ExercisePerformancePoint[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT w.workout_date AS workout_date, we.weight AS weight, we.reps AS reps
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = ? AND we.name = ?
       ORDER BY w.workout_date ASC, w.created_at ASC
       LIMIT ?`,
      [userId, exerciseName, limit],
    );
    return rows.map((row) => ({
      workoutDate: row.workout_date as string,
      weight: row.weight === null ? null : Number(row.weight),
      totalReps: parseReps(row.reps as string | number[]).reduce((sum, r) => sum + r, 0),
    }));
  }

  private async findById(userId: string, workoutId: string): Promise<Workout | null> {
    const [rows] = await this.pool.query<WorkoutRow[]>(
      'SELECT id, user_id, workout_date, duration_seconds, comments FROM workouts WHERE id = ? AND user_id = ? LIMIT 1',
      [workoutId, userId],
    );
    const [row] = rows;
    if (!row) return null;
    const [hydrated] = await this.hydrate([row]);
    return hydrated ?? null;
  }

  private async hydrate(rows: WorkoutRow[]): Promise<Workout[]> {
    if (rows.length === 0) return [];
    const workoutIds = rows.map((row) => row.id);
    const [exerciseRows] = await this.pool.query<WorkoutExerciseRow[]>(
      `SELECT id, workout_id, name, weight, sets, reps, sort_order FROM workout_exercises
       WHERE workout_id IN (?)
       ORDER BY workout_id, sort_order ASC`,
      [workoutIds],
    );
    const exercisesByWorkout = new Map<string, WorkoutExercise[]>();
    for (const row of exerciseRows) {
      const list = exercisesByWorkout.get(row.workout_id) ?? [];
      list.push(
        WorkoutExercise.fromPersistence({
          id: row.id,
          workoutId: row.workout_id,
          name: row.name,
          weight: row.weight === null ? null : Number(row.weight),
          sets: row.sets,
          reps: parseReps(row.reps),
          sortOrder: row.sort_order,
        }),
      );
      exercisesByWorkout.set(row.workout_id, list);
    }

    return rows.map((row) =>
      Workout.fromPersistence({
        id: row.id,
        userId: row.user_id,
        workoutDate: row.workout_date,
        durationSeconds: row.duration_seconds,
        comments: row.comments,
        exercises: exercisesByWorkout.get(row.id) ?? [],
      }),
    );
  }
}
