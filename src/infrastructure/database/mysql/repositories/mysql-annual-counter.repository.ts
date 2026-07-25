import { Pool, RowDataPacket } from 'mysql2/promise';
import { AnnualCounter } from '../../../../domain/entities/annual-counter.entity';
import { AnnualCounterRepository } from '../../../../domain/repositories/annual-counter.repository';

interface AnnualCounterRow extends RowDataPacket {
  id: string;
  user_id: string;
  name: string;
  year: number;
  value: number;
}

export class MysqlAnnualCounterRepository implements AnnualCounterRepository {
  constructor(private readonly pool: Pool) {}

  async save(counter: AnnualCounter): Promise<void> {
    const json = counter.toJSON();
    await this.pool.query('INSERT INTO annual_counters (id, user_id, name, year, value) VALUES (?, ?, ?, ?, ?)', [
      json.id,
      counter.userId,
      json.name,
      json.year,
      json.value,
    ]);
  }

  async findById(id: string): Promise<AnnualCounter | null> {
    const [rows] = await this.pool.query<AnnualCounterRow[]>('SELECT * FROM annual_counters WHERE id = ? LIMIT 1', [id]);
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findAllByUserAndYear(userId: string, year: number): Promise<AnnualCounter[]> {
    const [rows] = await this.pool.query<AnnualCounterRow[]>(
      'SELECT * FROM annual_counters WHERE user_id = ? AND year = ? ORDER BY created_at ASC',
      [userId, year],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async findByUserNameAndYear(userId: string, name: string, year: number): Promise<AnnualCounter | null> {
    const [rows] = await this.pool.query<AnnualCounterRow[]>(
      'SELECT * FROM annual_counters WHERE user_id = ? AND name = ? AND year = ? LIMIT 1',
      [userId, name, year],
    );
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query('DELETE FROM annual_counters WHERE id = ?', [id]);
  }

  private toEntity(row: AnnualCounterRow): AnnualCounter {
    return AnnualCounter.fromPersistence({ id: row.id, userId: row.user_id, name: row.name, year: row.year, value: row.value });
  }
}
