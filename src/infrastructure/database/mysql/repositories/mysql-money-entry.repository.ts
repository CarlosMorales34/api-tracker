import { Pool, RowDataPacket } from 'mysql2/promise';
import { MoneyEntry, MoneyEntryRecurrence, MoneyEntryType } from '../../../../domain/entities/money-entry.entity';
import { MoneyEntryRepository } from '../../../../domain/repositories/money-entry.repository';

interface MoneyEntryRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: MoneyEntryType;
  name: string;
  amount: number;
  recurrence: MoneyEntryRecurrence;
  week_start_date: string;
}

interface SumRow extends RowDataPacket {
  total: number | null;
}

export class MysqlMoneyEntryRepository implements MoneyEntryRepository {
  constructor(private readonly pool: Pool) {}

  async save(entry: MoneyEntry): Promise<void> {
    const json = entry.toJSON();
    await this.pool.query(
      `INSERT INTO finance_entries (id, user_id, type, name, amount, recurrence, week_start_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [json.id, entry.userId, json.type, json.name, json.amount, json.recurrence, json.weekStartDate],
    );
  }

  async update(entry: MoneyEntry): Promise<void> {
    const json = entry.toJSON();
    await this.pool.query('UPDATE finance_entries SET name = ?, amount = ?, recurrence = ? WHERE id = ?', [
      json.name,
      json.amount,
      json.recurrence,
      json.id,
    ]);
  }

  async findById(id: string): Promise<MoneyEntry | null> {
    const [rows] = await this.pool.query<MoneyEntryRow[]>('SELECT * FROM finance_entries WHERE id = ? LIMIT 1', [id]);
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findByUserAndWeek(userId: string, weekStartDate: string): Promise<MoneyEntry[]> {
    const [rows] = await this.pool.query<MoneyEntryRow[]>(
      'SELECT * FROM finance_entries WHERE user_id = ? AND week_start_date = ? ORDER BY created_at ASC',
      [userId, weekStartDate],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query('DELETE FROM finance_entries WHERE id = ?', [id]);
  }

  async sumByUserTypeAndMonth(userId: string, type: MoneyEntryType, year: number, month: number): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM finance_entries
       WHERE user_id = ? AND type = ? AND YEAR(week_start_date) = ? AND MONTH(week_start_date) = ?`,
      [userId, type, year, month],
    );
    return rows[0]?.total ?? 0;
  }

  async sumByUserTypeAndYear(userId: string, type: MoneyEntryType, year: number): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM finance_entries
       WHERE user_id = ? AND type = ? AND YEAR(week_start_date) = ?`,
      [userId, type, year],
    );
    return rows[0]?.total ?? 0;
  }

  async findDistinctYearsWithEntries(userId: string): Promise<number[]> {
    interface YearRow extends RowDataPacket {
      year: number;
    }
    const [rows] = await this.pool.query<YearRow[]>(
      `SELECT DISTINCT YEAR(week_start_date) AS year FROM finance_entries WHERE user_id = ? ORDER BY year DESC`,
      [userId],
    );
    return rows.map((row) => row.year);
  }

  async findDistinctYearsWithIncome(userId: string): Promise<number[]> {
    interface YearRow extends RowDataPacket {
      year: number;
    }
    const [rows] = await this.pool.query<YearRow[]>(
      `SELECT DISTINCT YEAR(week_start_date) AS year FROM finance_entries WHERE user_id = ? AND type = 'income' ORDER BY year DESC`,
      [userId],
    );
    return rows.map((row) => row.year);
  }

  private toEntity(row: MoneyEntryRow): MoneyEntry {
    return MoneyEntry.fromPersistence({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      name: row.name,
      amount: row.amount,
      recurrence: row.recurrence,
      weekStartDate: row.week_start_date,
    });
  }
}
