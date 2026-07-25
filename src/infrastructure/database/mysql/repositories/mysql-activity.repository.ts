import { Pool, RowDataPacket } from 'mysql2/promise';
import { Activity } from '../../../../domain/entities/activity.entity';
import { ActivityRepository } from '../../../../domain/repositories/activity.repository';

interface ActivityRow extends RowDataPacket {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  created_at: Date;
}

interface CountRow extends RowDataPacket {
  count: number;
}

export class MysqlActivityRepository implements ActivityRepository {
  constructor(private readonly pool: Pool) {}

  async save(activity: Activity): Promise<void> {
    await this.pool.query(
      `INSERT INTO activities (id, category_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order)`,
      [activity.id, activity.categoryId, activity.name, activity.sortOrder, activity.createdAt],
    );
  }

  async findById(id: string): Promise<Activity | null> {
    const [rows] = await this.pool.query<ActivityRow[]>('SELECT * FROM activities WHERE id = ? LIMIT 1', [id]);
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findByCategoryId(categoryId: string): Promise<Activity[]> {
    const [rows] = await this.pool.query<ActivityRow[]>(
      'SELECT * FROM activities WHERE category_id = ? ORDER BY sort_order ASC, created_at ASC',
      [categoryId],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async findAllByUserId(userId: string): Promise<Activity[]> {
    // Sin categoryId el front pide todas las actividades del usuario: join
    // contra activity_categories para filtrar por dueño (activities no tiene
    // user_id propio).
    const [rows] = await this.pool.query<ActivityRow[]>(
      `SELECT a.* FROM activities a
       INNER JOIN activity_categories ac ON ac.id = a.category_id
       WHERE ac.user_id = ?
       ORDER BY a.sort_order ASC, a.created_at ASC`,
      [userId],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async countByCategoryId(categoryId: string): Promise<number> {
    const [rows] = await this.pool.query<CountRow[]>(
      'SELECT COUNT(*) AS count FROM activities WHERE category_id = ?',
      [categoryId],
    );
    return rows[0]?.count ?? 0;
  }

  async updateSortOrder(id: string, sortOrder: number): Promise<void> {
    await this.pool.query('UPDATE activities SET sort_order = ? WHERE id = ?', [sortOrder, id]);
  }

  private toEntity(row: ActivityRow): Activity {
    return Activity.fromPersistence({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
    });
  }
}
