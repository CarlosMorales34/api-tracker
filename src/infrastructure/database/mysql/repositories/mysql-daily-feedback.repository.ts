import { Pool, RowDataPacket } from 'mysql2/promise';
import { DailyFeedbackRepository } from '../../../../domain/repositories/daily-feedback.repository';

interface DailyFeedbackRow extends RowDataPacket {
  note: string;
}

export class MysqlDailyFeedbackRepository implements DailyFeedbackRepository {
  constructor(private readonly pool: Pool) {}

  async find(userId: string, logDate: string): Promise<string | null> {
    const [rows] = await this.pool.query<DailyFeedbackRow[]>(
      'SELECT note FROM daily_feedback WHERE user_id = ? AND log_date = ? LIMIT 1',
      [userId, logDate],
    );
    const [row] = rows;
    return row ? row.note : null;
  }

  async upsert(userId: string, logDate: string, note: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO daily_feedback (id, user_id, log_date, note) VALUES (UUID(), ?, ?, ?)
       ON DUPLICATE KEY UPDATE note = VALUES(note)`,
      [userId, logDate, note],
    );
  }
}
