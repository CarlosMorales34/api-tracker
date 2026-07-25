import { Pool, RowDataPacket } from 'mysql2/promise';
import { WeekNoteRepository } from '../../../../domain/repositories/week-note.repository';

interface WeekNoteRow extends RowDataPacket {
  notes: string;
}

export class MysqlWeekNoteRepository implements WeekNoteRepository {
  constructor(private readonly pool: Pool) {}

  async find(userId: string, year: number, weekNumber: number): Promise<string | null> {
    const [rows] = await this.pool.query<WeekNoteRow[]>(
      'SELECT notes FROM week_notes WHERE user_id = ? AND year = ? AND week_number = ? LIMIT 1',
      [userId, year, weekNumber],
    );
    const [row] = rows;
    return row ? row.notes : null;
  }

  async upsert(userId: string, year: number, weekNumber: number, notes: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO week_notes (id, user_id, year, week_number, notes) VALUES (UUID(), ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE notes = VALUES(notes)`,
      [userId, year, weekNumber, notes],
    );
  }
}
