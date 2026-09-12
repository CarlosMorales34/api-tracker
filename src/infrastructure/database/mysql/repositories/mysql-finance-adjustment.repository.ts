import { Pool, RowDataPacket } from 'mysql2/promise';
import { FinanceAdjustment, FinanceAdjustmentTarget } from '../../../../domain/entities/finance-adjustment.entity';
import { FinanceAdjustmentRepository } from '../../../../domain/repositories/finance-adjustment.repository';

interface FinanceAdjustmentRow extends RowDataPacket {
  id: string;
  target: FinanceAdjustmentTarget;
  target_id: string | null;
  previous_amount: number;
  new_amount: number;
  difference: number;
  reason: string | null;
  created_at: Date;
}

export class MysqlFinanceAdjustmentRepository implements FinanceAdjustmentRepository {
  constructor(private readonly pool: Pool) {}

  async findRecentByUserAndTarget(
    userId: string,
    target: FinanceAdjustmentTarget,
    targetId: string | null,
    limit: number,
  ): Promise<FinanceAdjustment[]> {
    const [rows] = await this.pool.query<FinanceAdjustmentRow[]>(
      `SELECT id, target, target_id, previous_amount, new_amount, difference, reason, created_at
       FROM finance_adjustments
       WHERE user_id = ? AND target = ? AND target_id <=> ?
       ORDER BY created_at DESC LIMIT ?`,
      [userId, target, targetId, limit],
    );
    return rows.map((row) => ({
      id: row.id,
      target: row.target,
      targetId: row.target_id,
      previousAmount: row.previous_amount,
      newAmount: row.new_amount,
      difference: row.difference,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  }
}
