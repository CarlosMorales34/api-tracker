import { Pool, RowDataPacket } from 'mysql2/promise';
import { DailyExpense } from '../../../../domain/entities/daily-expense.entity';
import { DailyExpenseRepository } from '../../../../domain/repositories/daily-expense.repository';

interface DailyExpenseRow extends RowDataPacket {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  expense_date: string;
}

interface SumRow extends RowDataPacket {
  total: number | null;
}

export class MysqlDailyExpenseRepository implements DailyExpenseRepository {
  constructor(private readonly pool: Pool) {}

  async save(expense: DailyExpense): Promise<void> {
    const json = expense.toJSON();
    await this.pool.query(
      'INSERT INTO daily_expenses (id, user_id, name, amount, expense_date) VALUES (?, ?, ?, ?, ?)',
      [json.id, expense.userId, json.name, json.amount, json.expenseDate],
    );
  }

  async update(expense: DailyExpense): Promise<void> {
    const json = expense.toJSON();
    await this.pool.query('UPDATE daily_expenses SET name = ?, amount = ? WHERE id = ?', [json.name, json.amount, json.id]);
  }

  async findById(id: string): Promise<DailyExpense | null> {
    const [rows] = await this.pool.query<DailyExpenseRow[]>('SELECT * FROM daily_expenses WHERE id = ? LIMIT 1', [id]);
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findByUserAndDate(userId: string, date: string): Promise<DailyExpense[]> {
    const [rows] = await this.pool.query<DailyExpenseRow[]>(
      'SELECT * FROM daily_expenses WHERE user_id = ? AND expense_date = ? ORDER BY created_at ASC',
      [userId, date],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query('DELETE FROM daily_expenses WHERE id = ?', [id]);
  }

  async sumByUserAndMonth(userId: string, year: number, month: number): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM daily_expenses
       WHERE user_id = ? AND YEAR(expense_date) = ? AND MONTH(expense_date) = ?`,
      [userId, year, month],
    );
    return rows[0]?.total ?? 0;
  }

  async sumByUserAndDateRange(userId: string, from: string, to: string): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM daily_expenses WHERE user_id = ? AND expense_date BETWEEN ? AND ?',
      [userId, from, to],
    );
    return rows[0]?.total ?? 0;
  }

  private toEntity(row: DailyExpenseRow): DailyExpense {
    return DailyExpense.fromPersistence({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      amount: row.amount,
      expenseDate: row.expense_date,
    });
  }
}
