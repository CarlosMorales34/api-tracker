import { Pool, RowDataPacket } from 'mysql2/promise';
import {
  AnalyticsActivityTimeEntry,
  AnalyticsActivityTotal,
  AnalyticsBodyGoalSnapshot,
  AnalyticsBodyMeasurementPoint,
  AnalyticsCategoryTotal,
  AnalyticsExerciseTotal,
  AnalyticsRoutineTimeEntry,
  AnalyticsWorkoutSession,
  PersonalAnalyticsRepository,
} from '../../../../domain/repositories/personal-analytics.repository';

interface RoutineTimeRow extends RowDataPacket {
  routine_id: string;
  routine_name: string;
  is_sleep: number;
  log_date: string | Date;
  start_time: string;
  end_time: string;
}

interface ActivityTimeRow extends RowDataPacket {
  category_id: string;
  category_name: string;
  category_color: string;
  activity_id: string;
  activity_name: string;
  log_date: string | Date;
  start_time: string;
  end_time: string;
  source: 'manual' | 'routine';
  source_routine_id: string | null;
  source_routine_name: string | null;
}

interface CategoryTotalRow extends RowDataPacket {
  category_id: string;
  category_name: string;
  category_color: string;
  total_hours: number | string | null;
  active_days: number;
}

interface ActivityTotalRow extends RowDataPacket {
  category_id: string;
  category_name: string;
  activity_id: string;
  activity_name: string;
  total_hours: number | string | null;
  active_days: number;
}

interface WorkoutSessionRow extends RowDataPacket {
  workout_id: string;
  workout_date: string | Date;
  duration_minutes: number | string;
}

interface WorkoutExerciseRow extends RowDataPacket {
  workout_id: string;
  name: string;
  weight: number | string | null;
  sets: number;
  reps: string | number[];
}

interface ExerciseTotalRow extends RowDataPacket {
  workout_id: string;
  workout_date: string | Date;
  exercise_name: string;
  weight: number | string | null;
  reps: string | number[];
}

interface BodyGoalRow extends RowDataPacket {
  goal_type: 'lose' | 'gain' | 'maintain' | 'recomp';
  start_weight_kg: number | string;
  target_weight_kg: number | string | null;
  start_date: string | Date;
  target_date: string | Date | null;
}

const timeDurationSql = `
  CASE
    WHEN TIME_TO_SEC(alt.end_time) >= TIME_TO_SEC(alt.start_time)
      THEN (TIME_TO_SEC(alt.end_time) - TIME_TO_SEC(alt.start_time)) / 3600
    ELSE (86400 - TIME_TO_SEC(alt.start_time) + TIME_TO_SEC(alt.end_time)) / 3600
  END
`;

interface BodyMeasurementRow extends RowDataPacket {
  measured_at: string | Date;
  weight_kg: number | string | null;
  body_fat_percentage: number | string | null;
  waist_cm: number | string | null;
}

function dateOnly(value: string | Date | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function dateTimeIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function numberOrZero(value: number | string | null): number {
  return value === null ? 0 : Number(value);
}

function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function parseReps(value: string | number[]): number[] {
  return Array.isArray(value) ? value : (JSON.parse(value) as number[]);
}

export class MysqlPersonalAnalyticsRepository implements PersonalAnalyticsRepository {
  constructor(private readonly pool: Pool) {}

  async findRoutineTimes(userId: string, from: string, to: string): Promise<AnalyticsRoutineTimeEntry[]> {
    const [rows] = await this.pool.query<RoutineTimeRow[]>(
      `SELECT fr.id AS routine_id, fr.name AS routine_name, fr.is_sleep,
              rl.log_date, rlt.start_time, rlt.end_time
       FROM routine_log_times rlt
       JOIN routine_logs rl ON rl.id = rlt.routine_log_id
       JOIN fixed_routines fr ON fr.id = rl.routine_id
       WHERE fr.user_id = ? AND rl.log_date BETWEEN ? AND ? AND rlt.end_time IS NOT NULL
       ORDER BY rl.log_date ASC, rlt.sort_order ASC`,
      [userId, from, to],
    );

    return rows.map((row) => ({
      routineId: row.routine_id,
      routineName: row.routine_name,
      isSleep: Boolean(row.is_sleep),
      logDate: dateOnly(row.log_date)!,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
    }));
  }

  async findActivityTimes(userId: string, from: string, to: string): Promise<AnalyticsActivityTimeEntry[]> {
    const [rows] = await this.pool.query<ActivityTimeRow[]>(
      `SELECT ac.id AS category_id, ac.name AS category_name, ac.color AS category_color,
              a.id AS activity_id, a.name AS activity_name, al.log_date,
              alt.start_time, alt.end_time, alt.source, alt.source_routine_id,
              fr.name AS source_routine_name
       FROM activity_log_times alt
       JOIN activity_logs al ON al.id = alt.activity_log_id
       JOIN activities a ON a.id = al.activity_id
       JOIN activity_categories ac ON ac.id = a.category_id
       LEFT JOIN fixed_routines fr ON fr.id = alt.source_routine_id
       WHERE ac.user_id = ? AND al.log_date BETWEEN ? AND ?
       ORDER BY al.log_date ASC, alt.sort_order ASC`,
      [userId, from, to],
    );

    return rows.map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      activityId: row.activity_id,
      activityName: row.activity_name,
      logDate: dateOnly(row.log_date)!,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      source: row.source,
      sourceRoutineId: row.source_routine_id,
      sourceRoutineName: row.source_routine_name,
    }));
  }

  async findCategoryTotals(userId: string, from: string, to: string): Promise<AnalyticsCategoryTotal[]> {
    const [rows] = await this.pool.query<CategoryTotalRow[]>(
      `SELECT ac.id AS category_id, ac.name AS category_name, ac.color AS category_color,
              ROUND(COALESCE(SUM(al.hours), 0), 2) AS total_hours,
              COUNT(DISTINCT al.log_date) AS active_days
       FROM activity_categories ac
       LEFT JOIN activities a ON a.category_id = ac.id
       LEFT JOIN activity_logs al ON al.activity_id = a.id AND al.log_date BETWEEN ? AND ?
       WHERE ac.user_id = ?
       GROUP BY ac.id, ac.name, ac.color
       ORDER BY total_hours DESC, ac.sort_order ASC, ac.created_at ASC`,
      [from, to, userId],
    );

    return rows.map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      totalHours: numberOrZero(row.total_hours),
      activeDays: Number(row.active_days),
    }));
  }

  async findActivityTotals(userId: string, from: string, to: string): Promise<AnalyticsActivityTotal[]> {
    const [rows] = await this.pool.query<ActivityTotalRow[]>(
      `SELECT ac.id AS category_id, ac.name AS category_name, a.id AS activity_id, a.name AS activity_name,
              ROUND(COALESCE(SUM(al.hours), 0), 2) AS total_hours,
              COUNT(DISTINCT al.log_date) AS active_days
       FROM activities a
       JOIN activity_categories ac ON ac.id = a.category_id
       LEFT JOIN activity_logs al ON al.activity_id = a.id AND al.log_date BETWEEN ? AND ?
       WHERE ac.user_id = ?
       GROUP BY ac.id, ac.name, a.id, a.name
       ORDER BY total_hours DESC, active_days DESC, a.sort_order ASC`,
      [from, to, userId],
    );

    return rows.map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      activityId: row.activity_id,
      activityName: row.activity_name,
      totalHours: numberOrZero(row.total_hours),
      activeDays: Number(row.active_days),
    }));
  }

  async findWorkoutSessions(userId: string, from: string, to: string): Promise<AnalyticsWorkoutSession[]> {
    const [workoutRows] = await this.pool.query<WorkoutSessionRow[]>(
      `SELECT w.id AS workout_id, w.workout_date, ROUND(w.duration_seconds / 60, 1) AS duration_minutes,
              w.created_at
       FROM workouts w
       WHERE w.user_id = ? AND w.workout_date BETWEEN ? AND ?
       ORDER BY w.workout_date ASC, w.created_at ASC`,
      [userId, from, to],
    );
    if (workoutRows.length === 0) return [];

    const [exerciseRows] = await this.pool.query<WorkoutExerciseRow[]>(
      `SELECT workout_id, name, weight, sets, reps
       FROM workout_exercises
       WHERE workout_id IN (?)
       ORDER BY workout_id, sort_order ASC`,
      [workoutRows.map((row) => row.workout_id)],
    );
    const exercisesByWorkout = new Map<string, WorkoutExerciseRow[]>();
    for (const row of exerciseRows) {
      const list = exercisesByWorkout.get(row.workout_id) ?? [];
      list.push(row);
      exercisesByWorkout.set(row.workout_id, list);
    }

    return workoutRows.map((row) => {
      const exercises = exercisesByWorkout.get(row.workout_id) ?? [];
      const totalReps = exercises.reduce((sum, exercise) => sum + parseReps(exercise.reps).reduce((a, b) => a + b, 0), 0);
      const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
      const totalVolume = exercises.reduce((sum, exercise) => {
        const weight = nullableNumber(exercise.weight) ?? 0;
        const reps = parseReps(exercise.reps).reduce((a, b) => a + b, 0);
        return sum + weight * reps;
      }, 0);
      return {
        workoutId: row.workout_id,
        workoutDate: dateOnly(row.workout_date)!,
        durationMinutes: Number(row.duration_minutes),
        exerciseCount: exercises.length,
        totalSets,
        totalReps,
        totalVolume: Math.round(totalVolume * 100) / 100,
      };
    });
  }

  async findExerciseTotals(userId: string, from: string, to: string): Promise<AnalyticsExerciseTotal[]> {
    const [rows] = await this.pool.query<ExerciseTotalRow[]>(
      `SELECT w.id AS workout_id, w.workout_date, we.name AS exercise_name, we.weight, we.reps
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = ? AND w.workout_date BETWEEN ? AND ?
       ORDER BY w.workout_date ASC, we.sort_order ASC`,
      [userId, from, to],
    );

    const byExercise = new Map<
      string,
      {
        exerciseName: string;
        appearances: number;
        lastDate: string;
        weights: number[];
        totalReps: number;
        totalVolume: number;
      }
    >();

    for (const row of rows) {
      const current = byExercise.get(row.exercise_name) ?? {
        exerciseName: row.exercise_name,
        appearances: 0,
        lastDate: dateOnly(row.workout_date)!,
        weights: [],
        totalReps: 0,
        totalVolume: 0,
      };
      const reps = parseReps(row.reps).reduce((sum, rep) => sum + rep, 0);
      const weight = nullableNumber(row.weight);
      current.appearances += 1;
      current.lastDate = dateOnly(row.workout_date)!;
      current.totalReps += reps;
      if (weight !== null) {
        current.weights.push(weight);
        current.totalVolume += weight * reps;
      }
      byExercise.set(row.exercise_name, current);
    }

    return [...byExercise.values()]
      .map((row) => ({
        exerciseName: row.exerciseName,
        appearances: row.appearances,
        lastDate: row.lastDate,
        avgWeight:
          row.weights.length > 0 ? Math.round((row.weights.reduce((sum, weight) => sum + weight, 0) / row.weights.length) * 100) / 100 : null,
        maxWeight: row.weights.length > 0 ? Math.max(...row.weights) : null,
        totalReps: row.totalReps,
        totalVolume: Math.round(row.totalVolume * 100) / 100,
      }))
      .sort((a, b) => b.appearances - a.appearances || b.lastDate.localeCompare(a.lastDate))
      .slice(0, 20);
  }

  async findBodyMeasurements(userId: string, from: string, to: string): Promise<AnalyticsBodyMeasurementPoint[]> {
    const [rows] = await this.pool.query<BodyMeasurementRow[]>(
      `SELECT measured_at, weight_kg, body_fat_percentage, waist_cm
       FROM body_measurements
       WHERE user_id = ? AND measured_at >= ? AND measured_at < DATE_ADD(?, INTERVAL 1 DAY)
       ORDER BY measured_at ASC`,
      [userId, from, to],
    );

    return rows.map((row) => ({
      measuredAt: dateTimeIso(row.measured_at),
      weightKg: nullableNumber(row.weight_kg),
      bodyFatPercentage: nullableNumber(row.body_fat_percentage),
      waistCm: nullableNumber(row.waist_cm),
    }));
  }

  async findActiveBodyGoal(userId: string): Promise<AnalyticsBodyGoalSnapshot | null> {
    const [rows] = await this.pool.query<BodyGoalRow[]>(
      `SELECT goal_type, start_weight_kg, target_weight_kg, start_date, target_date
       FROM body_goals
       WHERE user_id = ? AND is_active = TRUE
       LIMIT 1`,
      [userId],
    );
    const [row] = rows;
    if (!row) return null;
    return {
      goalType: row.goal_type,
      startWeightKg: Number(row.start_weight_kg),
      targetWeightKg: nullableNumber(row.target_weight_kg),
      startDate: dateOnly(row.start_date)!,
      targetDate: dateOnly(row.target_date),
    };
  }
}
