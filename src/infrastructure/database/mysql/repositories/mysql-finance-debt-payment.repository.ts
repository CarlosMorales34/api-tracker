import { Pool, RowDataPacket } from 'mysql2/promise';
import { DebtPayment } from '../../../../domain/entities/debt-payment.entity';
import { FinanceDebtPaymentRepository } from '../../../../domain/repositories/finance-debt-payment.repository';

interface SumRow extends RowDataPacket {
  total: number | null;
}

export class MysqlFinanceDebtPaymentRepository implements FinanceDebtPaymentRepository {
  constructor(private readonly pool: Pool) {}

  async save(payment: DebtPayment & { userId: string }): Promise<void> {
    await this.pool.query(
      'INSERT INTO finance_debt_payments (id, user_id, week_start_date, amount) VALUES (?, ?, ?, ?)',
      [payment.id, payment.userId, payment.weekStartDate, payment.amount],
    );
  }

  async sumByUser(userId: string): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM finance_debt_payments WHERE user_id = ?',
      [userId],
    );
    return rows[0]?.total ?? 0;
  }

  async sumByUserAndWeek(userId: string, weekStartDate: string): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM finance_debt_payments WHERE user_id = ? AND week_start_date = ?',
      [userId, weekStartDate],
    );
    return rows[0]?.total ?? 0;
  }
}
