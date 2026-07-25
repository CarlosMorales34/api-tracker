import { Pool, RowDataPacket } from 'mysql2/promise';
import { ProductivitySettings } from '../../../../domain/entities/productivity-settings.entity';
import { ProductivitySettingsRepository } from '../../../../domain/repositories/productivity-settings.repository';

interface ProductivitySettingsRow extends RowDataPacket {
  weekly_target_hours: number;
}

export class MysqlProductivitySettingsRepository implements ProductivitySettingsRepository {
  constructor(private readonly pool: Pool) {}

  async find(userId: string): Promise<ProductivitySettings | null> {
    const [rows] = await this.pool.query<ProductivitySettingsRow[]>(
      'SELECT weekly_target_hours FROM user_productivity_settings WHERE user_id = ? LIMIT 1',
      [userId],
    );
    const [row] = rows;
    return row ? { weeklyTargetHours: row.weekly_target_hours } : null;
  }
}
