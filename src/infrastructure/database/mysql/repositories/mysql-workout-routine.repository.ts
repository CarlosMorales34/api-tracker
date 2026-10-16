import { randomUUID } from 'node:crypto';
import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { WorkoutRoutine, WorkoutRoutineExercise } from '../../../../domain/entities/workout-routine.entity';
import { resolveExerciseIdentity } from './mysql-exercise-catalog.repository';
import {
  WorkoutRoutineInput,
  WorkoutRoutineRepository,
} from '../../../../domain/repositories/workout-routine.repository';

interface WorkoutRoutineRow extends RowDataPacket {
  id: string;
  user_id: string;
  name: string;
  weekday: number | null;
  weekdays: string | number[] | null;
}

interface WorkoutRoutineExerciseRow extends RowDataPacket {
  id: string;
  routine_id: string;
  name: string;
  exercise_id: string | null;
  target_sets: number;
  target_reps: number;
  suggested_weight: number | null;
  is_bodyweight: number;
  sort_order: number;
}

export class MysqlWorkoutRoutineRepository implements WorkoutRoutineRepository {
  constructor(private readonly pool: Pool) {}

  async create(userId: string, input: WorkoutRoutineInput): Promise<WorkoutRoutine> {
    const routineId = randomUUID();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        'INSERT INTO workout_routines (id, user_id, name, weekday, weekdays) VALUES (?, ?, ?, ?, ?)',
        [routineId, userId, input.name, input.weekday, JSON.stringify(input.weekdays ?? (input.weekday === null ? [] : [input.weekday]))],
      );
      await this.insertExercises(connection, userId, routineId, input.exercises);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const created = await this.findById(userId, routineId);
    if (!created) throw new Error('WorkoutRoutine was created but could not be re-read');
    return created;
  }

  async update(userId: string, routineId: string, input: WorkoutRoutineInput): Promise<WorkoutRoutine | null> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query<ResultSetHeader>(
        'UPDATE workout_routines SET name = ?, weekday = ?, weekdays = ? WHERE id = ? AND user_id = ?',
        [input.name, input.weekday, JSON.stringify(input.weekdays ?? (input.weekday === null ? [] : [input.weekday])), routineId, userId],
      );
      if (result.affectedRows === 0) {
        await connection.rollback();
        return null;
      }

      await connection.query('DELETE FROM workout_routine_exercises WHERE routine_id = ?', [routineId]);
      await this.insertExercises(connection, userId, routineId, input.exercises);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return this.findById(userId, routineId);
  }

  async findAllByUserId(userId: string): Promise<WorkoutRoutine[]> {
    const [rows] = await this.pool.query<WorkoutRoutineRow[]>(
      'SELECT id, user_id, name, weekday, weekdays FROM workout_routines WHERE user_id = ? ORDER BY created_at ASC',
      [userId],
    );
    return this.hydrate(rows);
  }

  async delete(userId: string, routineId: string): Promise<void> {
    await this.pool.query('DELETE FROM workout_routines WHERE id = ? AND user_id = ?', [routineId, userId]);
  }

  private async insertExercises(
    connection: Awaited<ReturnType<Pool['getConnection']>>,
    userId: string,
    routineId: string,
    exercises: WorkoutRoutineInput['exercises'],
  ): Promise<void> {
    for (const [index, exercise] of exercises.entries()) {
      const identity = await resolveExerciseIdentity(connection, userId, exercise);
      await connection.query(
        `INSERT INTO workout_routine_exercises (id, routine_id, name, target_sets, target_reps, suggested_weight, is_bodyweight, sort_order, exercise_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          routineId,
          identity.name,
          exercise.targetSets,
          exercise.targetReps,
          exercise.suggestedWeight,
          exercise.isBodyweight,
          index,
          identity.id,
        ],
      );
    }
  }

  private async findById(userId: string, routineId: string): Promise<WorkoutRoutine | null> {
    const [rows] = await this.pool.query<WorkoutRoutineRow[]>(
      'SELECT id, user_id, name, weekday, weekdays FROM workout_routines WHERE id = ? AND user_id = ? LIMIT 1',
      [routineId, userId],
    );
    const [row] = rows;
    if (!row) return null;
    const [hydrated] = await this.hydrate([row]);
    return hydrated ?? null;
  }

  private async hydrate(rows: WorkoutRoutineRow[]): Promise<WorkoutRoutine[]> {
    if (rows.length === 0) return [];
    const routineIds = rows.map((row) => row.id);
    const [exerciseRows] = await this.pool.query<WorkoutRoutineExerciseRow[]>(
      `SELECT wre.id, wre.routine_id, COALESCE(ec.name, wre.name) AS name, wre.exercise_id, wre.target_sets, wre.target_reps, wre.suggested_weight, wre.is_bodyweight, wre.sort_order
       FROM workout_routine_exercises wre LEFT JOIN exercise_catalog ec ON ec.id = wre.exercise_id
       WHERE routine_id IN (?) ORDER BY routine_id, sort_order ASC`,
      [routineIds],
    );
    const exercisesByRoutine = new Map<string, WorkoutRoutineExercise[]>();
    for (const row of exerciseRows) {
      const list = exercisesByRoutine.get(row.routine_id) ?? [];
      list.push(
        WorkoutRoutineExercise.fromPersistence({
          id: row.id,
          routineId: row.routine_id,
          name: row.name,
          exerciseId: row.exercise_id,
          targetSets: row.target_sets,
          targetReps: row.target_reps,
          suggestedWeight: row.suggested_weight === null ? null : Number(row.suggested_weight),
          isBodyweight: Boolean(row.is_bodyweight),
          sortOrder: row.sort_order,
        }),
      );
      exercisesByRoutine.set(row.routine_id, list);
    }

    return rows.map((row) =>
      WorkoutRoutine.fromPersistence({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        weekday: row.weekday === null ? null : Number(row.weekday),
        weekdays: row.weekdays === null ? (row.weekday === null ? [] : [Number(row.weekday)]) : typeof row.weekdays === 'string' ? JSON.parse(row.weekdays) : row.weekdays,
        exercises: exercisesByRoutine.get(row.id) ?? [],
      }),
    );
  }
}
