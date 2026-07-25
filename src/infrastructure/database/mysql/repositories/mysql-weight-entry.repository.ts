import { Pool, RowDataPacket } from 'mysql2/promise';
import { WeightGoalDirection } from '../../../../domain/entities/weight-settings.entity';
import { WeightEntry } from '../../../../domain/entities/weight-entry.entity';
import { WeightBestEver, WeightEntryRepository } from '../../../../domain/repositories/weight-entry.repository';

interface WeightEntryRow extends RowDataPacket {
  user_id: string;
  year: number;
  month: number;
  value: number | null;
  note: string | null;
}

export class MysqlWeightEntryRepository implements WeightEntryRepository {
  constructor(private readonly pool: Pool) {}

  async upsertValue(userId: string, year: number, month: number, value: number | null): Promise<void> {
    await this.pool.query(
      `INSERT INTO weight_entries (id, user_id, year, month, value) VALUES (UUID(), ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [userId, year, month, value],
    );
  }

  async upsertNote(userId: string, year: number, month: number, note: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO weight_entries (id, user_id, year, month, note) VALUES (UUID(), ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE note = VALUES(note)`,
      [userId, year, month, note],
    );
  }

  async findByUserYearMonth(userId: string, year: number, month: number): Promise<WeightEntry | null> {
    const [rows] = await this.pool.query<WeightEntryRow[]>(
      'SELECT user_id, year, month, value, note FROM weight_entries WHERE user_id = ? AND year = ? AND month = ? LIMIT 1',
      [userId, year, month],
    );
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findAllByUserAndYear(userId: string, year: number): Promise<WeightEntry[]> {
    const [rows] = await this.pool.query<WeightEntryRow[]>(
      'SELECT user_id, year, month, value, note FROM weight_entries WHERE user_id = ? AND year = ? ORDER BY month ASC',
      [userId, year],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async findBestEver(userId: string, direction: WeightGoalDirection): Promise<WeightBestEver | null> {
    // direction viene de user_weight_settings (enum controlado server-side,
    // nunca de input directo del usuario en esta query) -- se resuelve a un
    // literal ASC/DESC fijo, nunca se interpola el valor externo dentro del SQL.
    const orderDirection = direction === 'gain' ? 'DESC' : 'ASC';
    const [rows] = await this.pool.query<WeightEntryRow[]>(
      `SELECT user_id, year, month, value, note FROM weight_entries
       WHERE user_id = ? AND value IS NOT NULL
       ORDER BY value ${orderDirection} LIMIT 1`,
      [userId],
    );
    const [row] = rows;
    return row && row.value !== null ? { value: row.value, year: row.year, month: row.month } : null;
  }

  async findAllWithValue(userId: string): Promise<WeightEntry[]> {
    const [rows] = await this.pool.query<WeightEntryRow[]>(
      `SELECT user_id, year, month, value, note FROM weight_entries
       WHERE user_id = ? AND value IS NOT NULL
       ORDER BY year ASC, month ASC`,
      [userId],
    );
    return rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: WeightEntryRow): WeightEntry {
    return WeightEntry.fromPersistence({ userId: row.user_id, year: row.year, month: row.month, value: row.value, note: row.note });
  }
}
