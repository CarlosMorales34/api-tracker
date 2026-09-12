import { randomUUID } from 'node:crypto';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { FinanceAdjustment } from '../../../../domain/entities/finance-adjustment.entity';
import { Currency, DEFAULT_FINANCE_SETTINGS, FinanceSettings } from '../../../../domain/entities/finance-settings.entity';
import { FinanceSettingsRepository } from '../../../../domain/repositories/finance-settings.repository';

interface FinanceSettingsRow extends RowDataPacket {
  debt_total: number;
  currency: Currency;
  week1_anchor_date: string | null;
  wallet_balance: number;
}

export class MysqlFinanceSettingsRepository implements FinanceSettingsRepository {
  constructor(private readonly pool: Pool) {}

  async find(userId: string): Promise<FinanceSettings | null> {
    const [rows] = await this.pool.query<FinanceSettingsRow[]>(
      'SELECT debt_total, currency, week1_anchor_date, wallet_balance FROM user_finance_settings WHERE user_id = ? LIMIT 1',
      [userId],
    );
    const [row] = rows;
    return row
      ? {
          debtTotal: row.debt_total,
          currency: row.currency,
          week1AnchorDate: row.week1_anchor_date,
          walletBalance: row.wallet_balance,
        }
      : null;
  }

  async upsert(
    userId: string,
    changes: { debtTotal?: number; currency?: Currency; week1AnchorDate?: string | null },
  ): Promise<FinanceSettings> {
    // No creamos la fila hasta el primer PUT (contrato explícito para GET), así
    // que el merge se hace en app: leemos lo existente (o el default) y
    // escribimos el estado completo resultante.
    const current = (await this.find(userId)) ?? DEFAULT_FINANCE_SETTINGS;
    const next: FinanceSettings = {
      debtTotal: changes.debtTotal ?? current.debtTotal,
      currency: changes.currency ?? current.currency,
      week1AnchorDate: changes.week1AnchorDate !== undefined ? changes.week1AnchorDate : current.week1AnchorDate,
      walletBalance: current.walletBalance,
    };

    await this.pool.query(
      `INSERT INTO user_finance_settings (user_id, debt_total, currency, week1_anchor_date, wallet_balance) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE debt_total = VALUES(debt_total), currency = VALUES(currency), week1_anchor_date = VALUES(week1_anchor_date)`,
      [userId, next.debtTotal, next.currency, next.week1AnchorDate, next.walletBalance],
    );

    return next;
  }

  async adjustWalletBalance(userId: string, delta: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_finance_settings (user_id, wallet_balance) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE wallet_balance = wallet_balance + VALUES(wallet_balance)`,
      [userId, delta],
    );
  }

  async reconcileWallet(
    userId: string,
    countedBalance: number,
    reason: string | null,
  ): Promise<{ settings: FinanceSettings; adjustment: FinanceAdjustment }> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<FinanceSettingsRow[]>(
        'SELECT debt_total, currency, week1_anchor_date, wallet_balance FROM user_finance_settings WHERE user_id = ? LIMIT 1 FOR UPDATE',
        [userId],
      );
      const current = rows[0]
        ? {
            debtTotal: rows[0].debt_total,
            currency: rows[0].currency,
            week1AnchorDate: rows[0].week1_anchor_date,
            walletBalance: rows[0].wallet_balance,
          }
        : DEFAULT_FINANCE_SETTINGS;

      const previousAmount = current.walletBalance;
      const difference = Math.round((countedBalance - previousAmount) * 100) / 100;
      const adjustmentId = randomUUID();

      await connection.query(
        `INSERT INTO user_finance_settings (user_id, debt_total, currency, week1_anchor_date, wallet_balance) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE wallet_balance = VALUES(wallet_balance)`,
        [userId, current.debtTotal, current.currency, current.week1AnchorDate, countedBalance],
      );
      await connection.query(
        `INSERT INTO finance_adjustments (id, user_id, target, target_id, previous_amount, new_amount, difference, reason)
         VALUES (?, ?, 'wallet', NULL, ?, ?, ?, ?)`,
        [adjustmentId, userId, previousAmount, countedBalance, difference, reason],
      );
      await connection.commit();

      return {
        settings: { ...current, walletBalance: countedBalance },
        adjustment: {
          id: adjustmentId,
          target: 'wallet',
          targetId: null,
          previousAmount,
          newAmount: countedBalance,
          difference,
          reason,
          createdAt: new Date(),
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
