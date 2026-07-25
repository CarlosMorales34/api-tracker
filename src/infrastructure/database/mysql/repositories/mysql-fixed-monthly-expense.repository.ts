import { Pool, RowDataPacket } from 'mysql2/promise';
import { FixedMonthlyExpense } from '../../../../domain/entities/fixed-monthly-expense.entity';
import { FixedMonthlyExpenseRepository } from '../../../../domain/repositories/fixed-monthly-expense.repository';

interface FixedMonthlyExpenseRow extends RowDataPacket {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  day_of_month: number | null;
  description: string | null;
}

interface SumRow extends RowDataPacket {
  total: number | null;
}

export class MysqlFixedMonthlyExpenseRepository implements FixedMonthlyExpenseRepository {
  constructor(private readonly pool: Pool) {}

  async save(expense: FixedMonthlyExpense): Promise<void> {
    const json = expense.toJSON();
    await this.pool.query(
      'INSERT INTO fixed_monthly_expenses (id, user_id, name, amount, day_of_month, description) VALUES (?, ?, ?, ?, ?, ?)',
      [json.id, expense.userId, json.name, json.amount, json.dayOfMonth, json.description],
    );
  }

  async update(expense: FixedMonthlyExpense): Promise<void> {
    const json = expense.toJSON();
    await this.pool.query('UPDATE fixed_monthly_expenses SET name = ?, amount = ?, day_of_month = ?, description = ? WHERE id = ?', [
      json.name,
      json.amount,
      json.dayOfMonth,
      json.description,
      json.id,
    ]);
  }

  async findById(id: string): Promise<FixedMonthlyExpense | null> {
    const [rows] = await this.pool.query<FixedMonthlyExpenseRow[]>(
      'SELECT * FROM fixed_monthly_expenses WHERE id = ? LIMIT 1',
      [id],
    );
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findAllByUserId(userId: string): Promise<FixedMonthlyExpense[]> {
    const [rows] = await this.pool.query<FixedMonthlyExpenseRow[]>(
      'SELECT * FROM fixed_monthly_expenses WHERE user_id = ? ORDER BY created_at ASC',
      [userId],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query('DELETE FROM fixed_monthly_expenses WHERE id = ?', [id]);
  }

  async sumByUserId(userId: string): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM fixed_monthly_expenses WHERE user_id = ?',
      [userId],
    );
    return rows[0]?.total ?? 0;
  }

  private toEntity(row: FixedMonthlyExpenseRow): FixedMonthlyExpense {
    return FixedMonthlyExpense.fromPersistence({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      amount: row.amount,
      dayOfMonth: row.day_of_month,
      description: row.description,
    });
  }
}
