import { Pool, RowDataPacket } from 'mysql2/promise';
import { UserTrainingSettings } from '../../../../domain/entities/user-training-settings.entity';
import { UserTrainingSettingsRepository } from '../../../../domain/repositories/user-training-settings.repository';

interface UserTrainingSettingsRow extends RowDataPacket {
  rest_weekdays: string | number[] | null;
}

function parseWeekdays(value: string | number[] | null): number[] {
  if (value === null) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class MysqlUserTrainingSettingsRepository implements UserTrainingSettingsRepository {
  constructor(private readonly pool: Pool) {}

  async find(userId: string): Promise<UserTrainingSettings | null> {
    const [rows] = await this.pool.query<UserTrainingSettingsRow[]>(
      'SELECT rest_weekdays FROM user_training_settings WHERE user_id = ? LIMIT 1',
      [userId],
    );
    const [row] = rows;
    return row ? { restWeekdays: parseWeekdays(row.rest_weekdays) } : null;
  }

  async upsert(userId: string, settings: UserTrainingSettings): Promise<UserTrainingSettings> {
    await this.pool.query(
      `INSERT INTO user_training_settings (user_id, rest_weekdays)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE rest_weekdays = VALUES(rest_weekdays)`,
      [userId, JSON.stringify(settings.restWeekdays)],
    );
    return settings;
  }
}
