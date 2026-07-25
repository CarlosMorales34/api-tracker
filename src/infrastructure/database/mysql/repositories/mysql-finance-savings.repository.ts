import { Pool, RowDataPacket } from 'mysql2/promise';
import { SavingsLogEntry } from '../../../../domain/entities/savings-log-entry.entity';
import { FinanceSavingsRepository } from '../../../../domain/repositories/finance-savings.repository';

interface SumRow extends RowDataPacket {
  total: number | null;
}

export class MysqlFinanceSavingsRepository implements FinanceSavingsRepository {
  constructor(private readonly pool: Pool) {}

  async save(entry: SavingsLogEntry & { userId: string }): Promise<void> {
    await this.pool.query('INSERT INTO finance_savings_log (id, user_id, week_start_date, amount) VALUES (?, ?, ?, ?)', [
      entry.id,
      entry.userId,
      entry.weekStartDate,
      entry.amount,
    ]);
  }

  async sumByUser(userId: string): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM finance_savings_log WHERE user_id = ?',
      [userId],
    );
    return rows[0]?.total ?? 0;
  }

  async sumByUserAndWeek(userId: string, weekStartDate: string): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM finance_savings_log WHERE user_id = ? AND week_start_date = ?',
      [userId, weekStartDate],
    );
    return rows[0]?.total ?? 0;
  }
}
