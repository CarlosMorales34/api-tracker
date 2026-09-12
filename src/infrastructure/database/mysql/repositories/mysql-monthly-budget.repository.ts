import { randomUUID } from 'node:crypto';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { MonthlyBudget } from '../../../../domain/entities/monthly-budget.entity';
import { MonthlyBudgetRepository } from '../../../../domain/repositories/monthly-budget.repository';

interface MonthlyBudgetRow extends RowDataPacket {
  year: number;
  month: number;
  amount: number;
  currency: string;
}

export class MysqlMonthlyBudgetRepository implements MonthlyBudgetRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserYearMonth(userId: string, year: number, month: number): Promise<MonthlyBudget | null> {
    const [rows] = await this.pool.query<MonthlyBudgetRow[]>(
      'SELECT year, month, amount, currency FROM monthly_budgets WHERE user_id = ? AND year = ? AND month = ? LIMIT 1',
      [userId, year, month],
    );
    const [row] = rows;
    return row ? { year: row.year, month: row.month, amount: row.amount, currency: row.currency } : null;
  }

  async upsert(userId: string, budget: MonthlyBudget): Promise<MonthlyBudget> {
    await this.pool.query(
      `INSERT INTO monthly_budgets (id, user_id, year, month, amount, currency) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), currency = VALUES(currency)`,
      [randomUUID(), userId, budget.year, budget.month, budget.amount, budget.currency],
    );
    return budget;
  }
}
