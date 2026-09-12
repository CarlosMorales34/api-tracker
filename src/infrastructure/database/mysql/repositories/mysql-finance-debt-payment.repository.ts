import { Pool, RowDataPacket } from 'mysql2/promise';
import { DebtPayment } from '../../../../domain/entities/debt-payment.entity';
import { FinanceDebtPaymentRepository } from '../../../../domain/repositories/finance-debt-payment.repository';

interface SumRow extends RowDataPacket {
  total: number | null;
}

export class MysqlFinanceDebtPaymentRepository implements FinanceDebtPaymentRepository {
  constructor(private readonly pool: Pool) {}

  // Escribe el pago y aplica sus dos consecuencias (cartera, deuda) en una
  // sola transacción -- si algo falla a la mitad, no queda un pago
  // registrado sin reflejarse en los saldos (o viceversa). user_finance_settings
  // puede no tener fila todavía (usuario que nunca abrió Ajustes), por eso el
  // UPSERT en vez de un UPDATE directo.
  async recordPayment(
    payment: DebtPayment & { userId: string },
    walletDelta: number,
    principalAmount: number,
  ): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        'INSERT INTO finance_debt_payments (id, user_id, week_start_date, amount, interest_amount) VALUES (?, ?, ?, ?, ?)',
        [payment.id, payment.userId, payment.weekStartDate, payment.amount, payment.interestAmount],
      );
      await connection.query(
        `INSERT INTO user_finance_settings (user_id, wallet_balance, debt_total)
         VALUES (?, ?, GREATEST(0 - ?, 0))
         ON DUPLICATE KEY UPDATE
           wallet_balance = wallet_balance + VALUES(wallet_balance),
           debt_total = GREATEST(debt_total - ?, 0)`,
        [payment.userId, walletDelta, principalAmount, principalAmount],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
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

  async sumInterestByUserAndWeek(userId: string, weekStartDate: string): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      'SELECT COALESCE(SUM(interest_amount), 0) AS total FROM finance_debt_payments WHERE user_id = ? AND week_start_date = ?',
      [userId, weekStartDate],
    );
    return rows[0]?.total ?? 0;
  }

  async sumInterestByUserAndDateRange(userId: string, from: string, to: string): Promise<number> {
    const [rows] = await this.pool.query<SumRow[]>(
      'SELECT COALESCE(SUM(interest_amount), 0) AS total FROM finance_debt_payments WHERE user_id = ? AND week_start_date BETWEEN ? AND ?',
      [userId, from, to],
    );
    return rows[0]?.total ?? 0;
  }
}
