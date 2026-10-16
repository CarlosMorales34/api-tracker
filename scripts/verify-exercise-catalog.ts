import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MysqlExerciseCatalogRepository } from '../src/infrastructure/database/mysql/repositories/mysql-exercise-catalog.repository';
import { MysqlWorkoutRepository } from '../src/infrastructure/database/mysql/repositories/mysql-workout.repository';
import { MysqlWorkoutRoutineRepository } from '../src/infrastructure/database/mysql/repositories/mysql-workout-routine.repository';

// Isolated integration fixture; never imports or modifies the user's database.
async function main() {
  const database = `tracker_catalog_test_${Date.now()}`;
  const admin = await mysql.createConnection({ host: '127.0.0.1', user: 'root', multipleStatements: true });
  await admin.query(`CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const pool = mysql.createPool({ host: '127.0.0.1', user: 'root', database, multipleStatements: true, dateStrings: true });
  try {
    await pool.query(`
      CREATE TABLE users (id CHAR(36) PRIMARY KEY) ENGINE=InnoDB;
      CREATE TABLE workouts (id CHAR(36) PRIMARY KEY, user_id CHAR(36), workout_date DATE,
        source_routine_id CHAR(36) NULL, duration_seconds INT DEFAULT 0, comments TEXT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
      CREATE TABLE workout_exercises (id CHAR(36) PRIMARY KEY, workout_id CHAR(36), name VARCHAR(255), weight DECIMAL(6,2),
        is_bodyweight BOOLEAN DEFAULT FALSE, sets INT, reps JSON, sort_order INT) ENGINE=InnoDB;
      CREATE TABLE workout_routines (id CHAR(36) PRIMARY KEY, user_id CHAR(36), name VARCHAR(150), weekday INT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
      CREATE TABLE workout_routine_exercises (id CHAR(36) PRIMARY KEY, routine_id CHAR(36), name VARCHAR(255), target_sets INT,
        target_reps INT, suggested_weight DECIMAL(6,2), is_bodyweight BOOLEAN DEFAULT FALSE, sort_order INT) ENGINE=InnoDB;
    `);
    await pool.query('CREATE TABLE fixed_routines (is_sleep BOOLEAN) ENGINE=InnoDB');
    for (const table of ['routine_logs', 'routine_log_times', 'activity_logs', 'activity_log_times', 'activity_suggestions', 'suggestion_feedback', 'user_suggestion_settings', 'body_measurements', 'body_goals']) {
      await pool.query(`CREATE TABLE ${table} (id CHAR(36)) ENGINE=InnoDB`);
    }
    const user = randomUUID(); const otherUser = randomUUID(); const historicalWorkout = randomUUID();
    await pool.query('INSERT INTO users VALUES (?), (?)', [user, otherUser]);
    await pool.query('INSERT INTO workouts (id,user_id,workout_date) VALUES (?,?,?)', [historicalWorkout, user, '2026-09-01']);
    await pool.query('INSERT INTO workout_exercises VALUES (?,?,?,?,?,?,?,?), (?,?,?,?,?,?,?,?)', [
      randomUUID(), historicalWorkout, 'Curl   martillo', 20, false, 3, '[10,10,10]', 0,
      randomUUID(), historicalWorkout, 'Martillos', 22, false, 3, '[12,12,12]', 1,
    ]);
    const legacyRoutine = randomUUID();
    await pool.query('INSERT INTO workout_routines (id,user_id,name,weekday) VALUES (?,?,?,?)', [legacyRoutine, user, 'Legacy routine', 1]);
    await pool.query('INSERT INTO workout_routine_exercises VALUES (?,?,?,?,?,?,?,?)', [randomUUID(), legacyRoutine, 'Martillos', 3, 10, 20, false, 0]);
    const preflight = (await readFile(new URL('../sql/prod_20261016_preflight.sql', import.meta.url), 'utf8')).replace('USE vitalist;', `USE ${database};`);
    const verification = (await readFile(new URL('../sql/prod_20261016_verify.sql', import.meta.url), 'utf8')).replace('USE vitalist;', `USE ${database};`);
    const resultRows = (results: unknown) => (results as unknown[]).flatMap(result => Array.isArray(result) ? result : []) as Record<string, unknown>[];
    const [before] = await pool.query(preflight);
    assert.equal(resultRows(before).find(row => 'migration_038_status' in row)?.new_tables, 0);
    await pool.query(await readFile(new URL('../sql/038_exercise_catalog_and_routine_days.sql', import.meta.url), 'utf8'));
    const [after] = await pool.query(verification);
    assert(resultRows(after).filter(row => 'error_count' in row).every(row => Number(row.error_count) === 0));
    const [alreadyMigrated] = await pool.query(preflight);
    assert.equal(resultRows(alreadyMigrated).find(row => 'migration_038_status' in row)?.new_tables, 2);
    const catalog = new MysqlExerciseCatalogRepository(pool);
    const workouts = new MysqlWorkoutRepository(pool);
    const routines = new MysqlWorkoutRoutineRepository(pool);
    const entries = await catalog.list(user);
    assert.equal(entries.length, 2);
    const curl = entries.find(ex => ex.name === 'Curl martillo')!;
    const martillos = entries.find(ex => ex.name === 'Martillos')!;
    assert.equal((await catalog.create(user, '  CURL MARTILLO ')).id, curl.id);
    const foreign = await catalog.create(otherUser, 'Curl martillo');
    await assert.rejects(catalog.merge(user, martillos.id, foreign.id));
    await assert.rejects(workouts.create(user, { workoutDate: '2026-10-02', sourceRoutineId: null, durationSeconds: 60, comments: null,
      exercises: [{ exerciseId: foreign.id, name: 'Curl martillo', weight: 20, isBodyweight: false, sets: 3, reps: [10,10,10] }] }));
    assert.equal((await workouts.findByUserAndDateRange(user, '2026-10-02', '2026-10-02')).length, 0);
    const routine = await routines.create(user, { name: 'Pecho, hombros y biceps', weekday: null, weekdays: [1,4],
      exercises: [{ exerciseId: martillos.id, name: 'typo ignored', targetSets: 3, targetReps: 10, suggestedWeight: null, isBodyweight: false }] });
    assert.deepEqual(routine.toJSON().weekdays, [1,4]);
    await catalog.merge(user, martillos.id, curl.id);
    assert.equal((await catalog.list(user)).length, 1);
    const [historical] = await workouts.findByUserAndDateRange(user, '2026-09-01', '2026-09-01');
    assert.deepEqual(historical!.toJSON().exercises.map(ex => ex.name), ['Curl martillo', 'Curl martillo']);
    assert.deepEqual(historical!.toJSON().exercises.map(ex => ex.weight), [20,22]);
    assert.equal((await routines.findAllByUserId(user))[0]!.toJSON().exercises[0]!.exerciseId, curl.id);
    assert.equal((await workouts.findExerciseHistory(user, 'Curl martillo', 12)).length, 2);
    await catalog.create(user, 'Curl barra');
    await assert.rejects(catalog.rename(user, curl.id, 'Curl barra'));
    await catalog.rename(user, curl.id, 'Curl martillo con mancuernas');
    assert.equal((await workouts.findByUserAndDateRange(user, '2026-09-01', '2026-09-01'))[0]!.toJSON().exercises[0]!.name, 'Curl martillo con mancuernas');
    const created = await workouts.create(user, { workoutDate: '2026-10-01', sourceRoutineId: null, durationSeconds: 60, comments: null,
      exercises: [{ name: 'Martillos', weight: 27, isBodyweight: false, sets: 3, reps: [9,9,9] }] });
    assert.equal(created.toJSON().exercises[0]!.exerciseId, curl.id);
    assert.equal(created.toJSON().exercises[0]!.name, 'Curl martillo con mancuernas');
    assert.equal((await catalog.list(otherUser)).length, 1);
    console.log(JSON.stringify({ migration: 'ok', backfill: 'ok', aliasResolution: 'ok', mergePreservesHistory: 'ok', crossUserIsolation: 'ok', multiDayRoutine: 'ok', rename: 'ok' }));
  } finally {
    await pool.end();
    await admin.query(`DROP DATABASE ${database}`);
    await admin.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
