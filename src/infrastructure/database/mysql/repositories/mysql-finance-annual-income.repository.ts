import { Pool, RowDataPacket } from 'mysql2/promise';
import { FinanceAnnualIncome } from '../../../../domain/entities/finance-annual-income.entity';
import { FinanceAnnualIncomeRepository } from '../../../../domain/repositories/finance-annual-income.repository';

interface FinanceAnnualIncomeRow extends RowDataPacket {
  id: string;
  user_id: string;
  year: number;
  amount: number;
}

export class MysqlFinanceAnnualIncomeRepository implements FinanceAnnualIncomeRepository {
  constructor(private readonly pool: Pool) {}

  async findAllByUserId(userId: string): Promise<FinanceAnnualIncome[]> {
    const [rows] = await this.pool.query<FinanceAnnualIncomeRow[]>(
      'SELECT * FROM finance_annual_income WHERE user_id = ? ORDER BY year DESC',
      [userId],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async findByUserAndYear(userId: string, year: number): Promise<FinanceAnnualIncome | null> {
    const [rows] = await this.pool.query<FinanceAnnualIncomeRow[]>(
      'SELECT * FROM finance_annual_income WHERE user_id = ? AND year = ? LIMIT 1',
      [userId, year],
    );
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findById(id: string): Promise<FinanceAnnualIncome | null> {
    const [rows] = await this.pool.query<FinanceAnnualIncomeRow[]>(
      'SELECT * FROM finance_annual_income WHERE id = ? LIMIT 1',
      [id],
    );
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async upsert(entry: FinanceAnnualIncome): Promise<void> {
    const json = entry.toJSON();
    await this.pool.query(
      `INSERT INTO finance_annual_income (id, user_id, year, amount) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [json.id, entry.userId, json.year, json.amount],
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query('DELETE FROM finance_annual_income WHERE id = ?', [id]);
  }

  private toEntity(row: FinanceAnnualIncomeRow): FinanceAnnualIncome {
    return FinanceAnnualIncome.fromPersistence({
      id: row.id,
      userId: row.user_id,
      year: row.year,
      amount: row.amount,
    });
  }
}
