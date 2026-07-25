import { randomUUID } from 'node:crypto';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { RoutineLogRepository, RoutineLogTime } from '../../../../domain/repositories/routine-log.repository';

interface RoutineLogTimeRow extends RowDataPacket {
  routine_id: string;
  start_time: string;
  end_time: string | null;
}

interface RoutineLogIdRow extends RowDataPacket {
  id: string;
}

export class MysqlRoutineLogRepository implements RoutineLogRepository {
  constructor(private readonly pool: Pool) {}

  async findTimesByRoutineAndDate(routineId: string, logDate: string): Promise<RoutineLogTime[]> {
    const result = await this.findTimesByRoutineIdsAndDate([routineId], logDate);
    return result.get(routineId) ?? [];
  }

  async findTimesByRoutineIdsAndDate(routineIds: string[], logDate: string): Promise<Map<string, RoutineLogTime[]>> {
    const byRoutine = new Map<string, RoutineLogTime[]>();
    if (routineIds.length === 0) return byRoutine;

    const [rows] = await this.pool.query<RoutineLogTimeRow[]>(
      `SELECT rl.routine_id AS routine_id, rlt.start_time AS start_time, rlt.end_time AS end_time
       FROM routine_logs rl
       INNER JOIN routine_log_times rlt ON rlt.routine_log_id = rl.id
       WHERE rl.routine_id IN (?) AND rl.log_date = ?
       ORDER BY rlt.sort_order ASC`,
      [routineIds, logDate],
    );

    for (const row of rows) {
      const times = byRoutine.get(row.routine_id) ?? [];
      times.push({ start: row.start_time.slice(0, 5), end: row.end_time ? row.end_time.slice(0, 5) : null });
      byRoutine.set(row.routine_id, times);
    }
    return byRoutine;
  }

  async upsert(routineId: string, logDate: string, times: RoutineLogTime[]): Promise<void> {
    if (times.length === 0) {
      await this.pool.query('DELETE FROM routine_logs WHERE routine_id = ? AND log_date = ?', [routineId, logDate]);
      return;
    }

    const [existingRows] = await this.pool.query<RoutineLogIdRow[]>(
      'SELECT id FROM routine_logs WHERE routine_id = ? AND log_date = ? LIMIT 1',
      [routineId, logDate],
    );
    let logId = existingRows[0]?.id;

    if (!logId) {
      logId = randomUUID();
      await this.pool.query('INSERT INTO routine_logs (id, routine_id, log_date) VALUES (?, ?, ?)', [
        logId,
        routineId,
        logDate,
      ]);
    } else {
      await this.pool.query('DELETE FROM routine_log_times WHERE routine_log_id = ?', [logId]);
    }

    for (let index = 0; index < times.length; index += 1) {
      const time = times[index]!;
      await this.pool.query(
        'INSERT INTO routine_log_times (id, routine_log_id, start_time, end_time, sort_order) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), logId, time.start, time.end, index],
      );
    }
  }
}
