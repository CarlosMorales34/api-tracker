import { Pool, RowDataPacket } from 'mysql2/promise';
import { ActivityCategory } from '../../../../domain/entities/activity-category.entity';
import { ActivityCategoryRepository } from '../../../../domain/repositories/activity-category.repository';

interface ActivityCategoryRow extends RowDataPacket {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: Date;
}

interface CountRow extends RowDataPacket {
  count: number;
}

export class MysqlActivityCategoryRepository implements ActivityCategoryRepository {
  constructor(private readonly pool: Pool) {}

  async save(category: ActivityCategory): Promise<void> {
    await this.pool.query(
      `INSERT INTO activity_categories (id, user_id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), color = VALUES(color), sort_order = VALUES(sort_order)`,
      [category.id, category.userId, category.name, category.color, category.sortOrder, category.createdAt],
    );
  }

  async findById(id: string): Promise<ActivityCategory | null> {
    const [rows] = await this.pool.query<ActivityCategoryRow[]>(
      'SELECT * FROM activity_categories WHERE id = ? LIMIT 1',
      [id],
    );
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findAllByUserId(userId: string): Promise<ActivityCategory[]> {
    const [rows] = await this.pool.query<ActivityCategoryRow[]>(
      'SELECT * FROM activity_categories WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC',
      [userId],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async countByUserId(userId: string): Promise<number> {
    const [rows] = await this.pool.query<CountRow[]>(
      'SELECT COUNT(*) AS count FROM activity_categories WHERE user_id = ?',
      [userId],
    );
    return rows[0]?.count ?? 0;
  }

  async updateSortOrder(id: string, sortOrder: number): Promise<void> {
    await this.pool.query('UPDATE activity_categories SET sort_order = ? WHERE id = ?', [sortOrder, id]);
  }

  async deleteById(id: string): Promise<void> {
    // ON DELETE CASCADE en activities -> activity_logs -> activity_log_times
    // se encarga de limpiar todo lo que cuelga de esta categoría.
    await this.pool.query('DELETE FROM activity_categories WHERE id = ?', [id]);
  }

  private toEntity(row: ActivityCategoryRow): ActivityCategory {
    return ActivityCategory.fromPersistence({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      color: row.color,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
    });
  }
}
