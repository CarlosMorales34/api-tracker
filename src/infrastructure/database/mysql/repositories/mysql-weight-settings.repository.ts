import { Pool, RowDataPacket } from 'mysql2/promise';
import { WeightGoalDirection, WeightSettings } from '../../../../domain/entities/weight-settings.entity';
import { WeightSettingsRepository } from '../../../../domain/repositories/weight-settings.repository';

interface WeightSettingsRow extends RowDataPacket {
  goal_kg: number;
  goal_direction: WeightGoalDirection;
}

export class MysqlWeightSettingsRepository implements WeightSettingsRepository {
  constructor(private readonly pool: Pool) {}

  async find(userId: string): Promise<WeightSettings | null> {
    const [rows] = await this.pool.query<WeightSettingsRow[]>(
      'SELECT goal_kg, goal_direction FROM user_weight_settings WHERE user_id = ? LIMIT 1',
      [userId],
    );
    const [row] = rows;
    return row ? { goalKg: row.goal_kg, goalDirection: row.goal_direction } : null;
  }

  async upsert(userId: string, goalKg: number, goalDirection: WeightGoalDirection): Promise<WeightSettings> {
    await this.pool.query(
      `INSERT INTO user_weight_settings (user_id, goal_kg, goal_direction) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE goal_kg = VALUES(goal_kg), goal_direction = VALUES(goal_direction)`,
      [userId, goalKg, goalDirection],
    );
    return { goalKg, goalDirection };
  }
}
