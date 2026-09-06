import { Pool, RowDataPacket } from 'mysql2/promise';
import { UserSuggestionSettings } from '../../../../domain/entities/user-suggestion-settings.entity';
import { UserSuggestionSettingsRepository } from '../../../../domain/repositories/user-suggestion-settings.repository';

interface UserSuggestionSettingsRow extends RowDataPacket {
  suggestions_enabled: number;
}

export class MysqlUserSuggestionSettingsRepository implements UserSuggestionSettingsRepository {
  constructor(private readonly pool: Pool) {}

  async find(userId: string): Promise<UserSuggestionSettings | null> {
    const [rows] = await this.pool.query<UserSuggestionSettingsRow[]>(
      'SELECT suggestions_enabled FROM user_suggestion_settings WHERE user_id = ? LIMIT 1',
      [userId],
    );
    const [row] = rows;
    return row ? { suggestionsEnabled: Boolean(row.suggestions_enabled) } : null;
  }

  async upsert(userId: string, settings: UserSuggestionSettings): Promise<UserSuggestionSettings> {
    await this.pool.query(
      `INSERT INTO user_suggestion_settings (user_id, suggestions_enabled) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE suggestions_enabled = VALUES(suggestions_enabled)`,
      [userId, settings.suggestionsEnabled],
    );
    return settings;
  }
}
