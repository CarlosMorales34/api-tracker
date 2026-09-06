import { Pool, RowDataPacket } from 'mysql2/promise';
import { UserModuleSettings } from '../../../../domain/entities/user-module-settings.entity';
import { UserModuleSettingsRepository } from '../../../../domain/repositories/user-module-settings.repository';

interface UserModuleSettingsRow extends RowDataPacket {
  has_activities: number;
  has_finance: number;
  has_health: number;
}

export class MysqlUserModuleSettingsRepository implements UserModuleSettingsRepository {
  constructor(private readonly pool: Pool) {}

  async find(userId: string): Promise<UserModuleSettings | null> {
    const [rows] = await this.pool.query<UserModuleSettingsRow[]>(
      'SELECT has_activities, has_finance, has_health FROM user_module_settings WHERE user_id = ? LIMIT 1',
      [userId],
    );
    const [row] = rows;
    return row
      ? {
          hasActivities: Boolean(row.has_activities),
          hasFinance: Boolean(row.has_finance),
          hasHealth: Boolean(row.has_health),
        }
      : null;
  }

  async upsert(userId: string, settings: UserModuleSettings): Promise<UserModuleSettings> {
    await this.pool.query(
      `INSERT INTO user_module_settings (user_id, has_activities, has_finance, has_health)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE has_activities = VALUES(has_activities), has_finance = VALUES(has_finance),
         has_health = VALUES(has_health)`,
      [userId, settings.hasActivities, settings.hasFinance, settings.hasHealth],
    );
    return settings;
  }
}
