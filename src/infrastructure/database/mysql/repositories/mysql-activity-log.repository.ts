import { randomUUID } from 'node:crypto';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { ActivityLog, ActivityLogDetail } from '../../../../domain/entities/activity-log.entity';
import { ActivityLogRepository, ActivityLogTime } from '../../../../domain/repositories/activity-log.repository';

interface ActivityLogRow extends RowDataPacket {
  id: string;
  activity_id: string;
  log_date: string;
  hours: number;
  note: string | null;
}

interface ActivityLogDetailRow extends RowDataPacket {
  activity_id: string;
  activity_name: string;
  category_id: string;
  category_name: string;
  category_color: string;
  log_date: string;
  hours: number;
}

interface ActivityLogTimeRow extends RowDataPacket {
  activity_id: string;
  start_time: string;
  end_time: string;
  source: 'manual' | 'routine';
  routine_name: string | null;
}

interface ActivityLogIdRow extends RowDataPacket {
  id: string;
}

// "HH:MM:SS" o "HH:MM" (MySQL TIME) -> horas decimales. No maneja cruce de
// medianoche (a diferencia de las rutinas "Dormir") porque una actividad
// siempre se registra dentro del mismo día -- si end <= start se descarta.
function durationHours(start: string, end: string): number {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 0) * 60 + (endM ?? 0);
  if (endMinutes <= startMinutes) return 0;
  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

export class MysqlActivityLogRepository implements ActivityLogRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserAndDateRange(userId: string, from: string, to: string): Promise<ActivityLog[]> {
    const [rows] = await this.pool.query<ActivityLogRow[]>(
      `SELECT al.id, al.activity_id, al.log_date, al.hours, al.note
       FROM activity_logs al
       INNER JOIN activities a ON a.id = al.activity_id
       INNER JOIN activity_categories ac ON ac.id = a.category_id
       WHERE ac.user_id = ? AND al.log_date BETWEEN ? AND ?
       ORDER BY al.log_date ASC`,
      [userId, from, to],
    );
    return rows.map((row) => ({
      id: row.id,
      activityId: row.activity_id,
      logDate: row.log_date,
      hours: row.hours,
      note: row.note,
    }));
  }

  async findDetailedByUserAndDateRange(userId: string, from: string, to: string): Promise<ActivityLogDetail[]> {
    const [rows] = await this.pool.query<ActivityLogDetailRow[]>(
      `SELECT
         a.id AS activity_id, a.name AS activity_name,
         ac.id AS category_id, ac.name AS category_name, ac.color AS category_color,
         al.log_date, al.hours
       FROM activity_logs al
       INNER JOIN activities a ON a.id = al.activity_id
       INNER JOIN activity_categories ac ON ac.id = a.category_id
       WHERE ac.user_id = ? AND al.log_date BETWEEN ? AND ?
       ORDER BY al.log_date ASC`,
      [userId, from, to],
    );
    return rows.map((row) => ({
      activityId: row.activity_id,
      activityName: row.activity_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      logDate: row.log_date,
      hours: row.hours,
    }));
  }

  async findHoursByActivityIdsAndDate(activityIds: string[], logDate: string): Promise<Map<string, number>> {
    const byActivity = new Map<string, number>();
    if (activityIds.length === 0) return byActivity;

    interface ActivityHoursRow extends RowDataPacket {
      activity_id: string;
      hours: number;
    }
    const [rows] = await this.pool.query<ActivityHoursRow[]>(
      'SELECT activity_id, hours FROM activity_logs WHERE activity_id IN (?) AND log_date = ?',
      [activityIds, logDate],
    );
    for (const row of rows) {
      byActivity.set(row.activity_id, row.hours);
    }
    return byActivity;
  }

  async findTimesByActivityIdsAndDate(activityIds: string[], logDate: string): Promise<Map<string, ActivityLogTime[]>> {
    const byActivity = new Map<string, ActivityLogTime[]>();
    if (activityIds.length === 0) return byActivity;

    const [rows] = await this.pool.query<ActivityLogTimeRow[]>(
      `SELECT al.activity_id AS activity_id, alt.start_time AS start_time, alt.end_time AS end_time,
              alt.source AS source, fr.name AS routine_name
       FROM activity_logs al
       INNER JOIN activity_log_times alt ON alt.activity_log_id = al.id
       LEFT JOIN fixed_routines fr ON fr.id = alt.source_routine_id
       WHERE al.activity_id IN (?) AND al.log_date = ?
       ORDER BY alt.sort_order ASC`,
      [activityIds, logDate],
    );

    for (const row of rows) {
      const times = byActivity.get(row.activity_id) ?? [];
      times.push({
        start: row.start_time.slice(0, 5),
        end: row.end_time.slice(0, 5),
        source: row.source,
        routineName: row.routine_name,
      });
      byActivity.set(row.activity_id, times);
    }
    return byActivity;
  }

  async upsertManualTimes(activityId: string, logDate: string, times: { start: string; end: string }[]): Promise<void> {
    await this.replaceTimes(activityId, logDate, times, { source: 'manual' });
  }

  async syncRoutineTimes(
    activityId: string,
    logDate: string,
    routineId: string,
    times: { start: string; end: string }[],
  ): Promise<void> {
    await this.replaceTimes(activityId, logDate, times, { source: 'routine', routineId });
  }

  // Reemplaza solo el subconjunto de entradas identificado por `scope`
  // (manuales, o las de una rutina puntual) dejando las demás intactas, y
  // recalcula activity_logs.hours como la suma de TODO lo que quede.
  private async replaceTimes(
    activityId: string,
    logDate: string,
    times: { start: string; end: string }[],
    scope: { source: 'manual' } | { source: 'routine'; routineId: string },
  ): Promise<void> {
    const [existingRows] = await this.pool.query<ActivityLogIdRow[]>(
      'SELECT id FROM activity_logs WHERE activity_id = ? AND log_date = ? LIMIT 1',
      [activityId, logDate],
    );
    let logId = existingRows[0]?.id;

    if (!logId) {
      if (times.length === 0) return;
      logId = randomUUID();
      await this.pool.query('INSERT INTO activity_logs (id, activity_id, log_date, hours) VALUES (?, ?, ?, 0)', [
        logId,
        activityId,
        logDate,
      ]);
    } else if (scope.source === 'manual') {
      await this.pool.query("DELETE FROM activity_log_times WHERE activity_log_id = ? AND source = 'manual'", [logId]);
    } else {
      await this.pool.query(
        "DELETE FROM activity_log_times WHERE activity_log_id = ? AND source = 'routine' AND source_routine_id = ?",
        [logId, scope.routineId],
      );
    }

    for (let index = 0; index < times.length; index += 1) {
      const time = times[index]!;
      await this.pool.query(
        `INSERT INTO activity_log_times (id, activity_log_id, start_time, end_time, sort_order, source, source_routine_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), logId, time.start, time.end, index, scope.source, scope.source === 'routine' ? scope.routineId : null],
      );
    }

    await this.recomputeHours(logId);
  }

  // Suma la duración de todas las entradas restantes (manuales + de rutina)
  // y la persiste en activity_logs.hours -- todo lo que ya lee ese campo
  // (Registro Semanal, dashboard, Home) sigue funcionando sin cambios. Si no
  // queda ninguna entrada, borra el activity_log entero.
  private async recomputeHours(logId: string): Promise<void> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT start_time, end_time FROM activity_log_times WHERE activity_log_id = ?',
      [logId],
    );

    if (rows.length === 0) {
      await this.pool.query('DELETE FROM activity_logs WHERE id = ?', [logId]);
      return;
    }

    const totalHours =
      Math.round(rows.reduce((sum, row) => sum + durationHours(String(row.start_time), String(row.end_time)), 0) * 100) /
      100;

    await this.pool.query('UPDATE activity_logs SET hours = ? WHERE id = ?', [totalHours, logId]);
  }
}
