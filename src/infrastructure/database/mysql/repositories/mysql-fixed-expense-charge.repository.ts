import { randomUUID } from 'node:crypto';
import { Pool } from 'mysql2/promise';
import { FixedExpenseChargeRepository } from '../../../../domain/repositories/fixed-expense-charge.repository';

interface MysqlError extends Error {
  code?: string;
}

export class MysqlFixedExpenseChargeRepository implements FixedExpenseChargeRepository {
  constructor(private readonly pool: Pool) {}

  async createIfNotExists(fixedExpenseId: string, chargeDate: string, amount: number): Promise<boolean> {
    // Plain INSERT (sin ON DUPLICATE KEY): o se inserta (fila nueva, true) o
    // truena por la UNIQUE(fixed_expense_id, charge_date) (ya existía,
    // false). affectedRows de un ON DUPLICATE KEY UPDATE no es confiable
    // acá para distinguir "insert nuevo" de "no-op" (MariaDB lo reportó
    // como 1 en ambos casos, causando doble descuento en la cartera).
    try {
      await this.pool.query('INSERT INTO fixed_expense_charges (id, fixed_expense_id, charge_date, amount) VALUES (?, ?, ?, ?)', [
        randomUUID(),
        fixedExpenseId,
        chargeDate,
        amount,
      ]);
      return true;
    } catch (error) {
      if ((error as MysqlError).code === 'ER_DUP_ENTRY') {
        return false;
      }
      throw error;
    }
  }
}
