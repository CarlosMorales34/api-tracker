import { randomUUID } from 'node:crypto';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { ActivityLog, ActivityLogDetail } from '../../../../domain/entities/activity-log.entity';
import { ActivityLogRepository } from '../../../../domain/repositories/activity-log.repository';

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

  async upsertHours(activityId: string, logDate: string, hours: number | null): Promise<void> {
    if (hours === null) {
      await this.pool.query('DELETE FROM activity_logs WHERE activity_id = ? AND log_date = ?', [activityId, logDate]);
      return;
    }

    await this.pool.query(
      `INSERT INTO activity_logs (id, activity_id, log_date, hours) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE hours = VALUES(hours)`,
      [randomUUID(), activityId, logDate, hours],
    );
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
}
