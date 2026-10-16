import { randomUUID } from 'node:crypto';
import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { DomainError, NotFoundError } from '../../../../domain/errors/domain.error';
import { CatalogExercise, ExerciseCatalogRepository } from '../../../../domain/repositories/exercise-catalog.repository';
import { normalizeExerciseName } from '../../../../shared/utils/exercise-name';

export async function resolveExerciseIdentity(connection: PoolConnection, userId: string, input: { exerciseId?: string | null; name: string }): Promise<{ id: string; name: string }> {
  const key = normalizeExerciseName(input.name);
  if (input.exerciseId) {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT id, name FROM exercise_catalog WHERE id = ? AND user_id = ? FOR UPDATE', [input.exerciseId, userId]);
    if (!rows[0]) throw new NotFoundError('Exercise', input.exerciseId);
    return { id: rows[0].id, name: rows[0].name };
  }
  if (!key) throw new DomainError('El ejercicio necesita un nombre');
  const [aliases] = await connection.query<RowDataPacket[]>(
    'SELECT ec.id, ec.name FROM exercise_aliases ea JOIN exercise_catalog ec ON ec.id = ea.exercise_id WHERE ea.user_id = ? AND ea.normalized_name = ? FOR UPDATE', [userId, key]);
  if (aliases[0]) return { id: aliases[0].id, name: aliases[0].name };
  await connection.query('INSERT INTO exercise_catalog (id, user_id, name, normalized_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
    [randomUUID(), userId, input.name.trim().replace(/\s+/g, ' '), key]);
  const [rows] = await connection.query<RowDataPacket[]>('SELECT id, name FROM exercise_catalog WHERE user_id = ? AND normalized_name = ? FOR UPDATE', [userId, key]);
  const row = rows[0]!;
  await connection.query('INSERT INTO exercise_aliases (user_id, normalized_name, exercise_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE normalized_name = normalized_name', [userId, key, row.id]);
  return { id: row.id, name: row.name };
}

export class MysqlExerciseCatalogRepository implements ExerciseCatalogRepository {
  constructor(private readonly pool: Pool) {}

  async list(userId: string): Promise<CatalogExercise[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ec.id, ec.name, (SELECT COUNT(*) FROM workout_exercises we WHERE we.exercise_id = ec.id) AS record_count
       FROM exercise_catalog ec WHERE ec.user_id = ? ORDER BY ec.name`, [userId]);
    const [aliases] = await this.pool.query<RowDataPacket[]>('SELECT exercise_id, normalized_name FROM exercise_aliases WHERE user_id = ?', [userId]);
    const byId = new Map<string, string[]>();
    for (const alias of aliases) { const list = byId.get(alias.exercise_id) ?? []; list.push(alias.normalized_name); byId.set(alias.exercise_id, list); }
    return rows.map(row => ({ id: row.id, name: row.name, aliases: byId.get(row.id) ?? [], recordCount: Number(row.record_count) }));
  }

  async create(userId: string, name: string): Promise<CatalogExercise> {
    const connection = await this.pool.getConnection();
    let exercise: { id: string; name: string };
    try { await connection.beginTransaction(); exercise = await resolveExerciseIdentity(connection, userId, { name }); await connection.commit(); }
    catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    return (await this.list(userId)).find(row => row.id === exercise.id)!;
  }

  async rename(userId: string, id: string, name: string): Promise<void> {
    const connection = await this.pool.getConnection();
    const key = normalizeExerciseName(name);
    try {
      await connection.beginTransaction();
      await resolveExerciseIdentity(connection, userId, { exerciseId: id, name });
      const [aliases] = await connection.query<RowDataPacket[]>('SELECT exercise_id FROM exercise_aliases WHERE user_id = ? AND normalized_name = ? FOR UPDATE', [userId, key]);
      if (aliases[0] && aliases[0].exercise_id !== id) throw new DomainError('Ese nombre ya pertenece a otro ejercicio; utiliza Unificar');
      await connection.query('UPDATE exercise_catalog SET name = ?, normalized_name = ? WHERE id = ? AND user_id = ?', [name.trim().replace(/\s+/g, ' '), key, id, userId]);
      await connection.query('INSERT INTO exercise_aliases (user_id, normalized_name, exercise_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE normalized_name = normalized_name', [userId, key, id]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async merge(userId: string, sourceId: string, targetId: string): Promise<void> {
    if (sourceId === targetId) throw new DomainError('Selecciona dos ejercicios diferentes');
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM exercise_catalog WHERE user_id = ? AND id IN (?, ?) ORDER BY id FOR UPDATE', [userId, sourceId, targetId]);
      if (rows.length !== 2) throw new NotFoundError('Exercise', sourceId);
      await connection.query('UPDATE workout_exercises SET exercise_id = ? WHERE exercise_id = ?', [targetId, sourceId]);
      await connection.query('UPDATE workout_routine_exercises SET exercise_id = ? WHERE exercise_id = ?', [targetId, sourceId]);
      await connection.query('UPDATE exercise_aliases SET exercise_id = ? WHERE user_id = ? AND exercise_id = ?', [targetId, userId, sourceId]);
      await connection.query('DELETE FROM exercise_catalog WHERE id = ? AND user_id = ?', [sourceId, userId]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
}
