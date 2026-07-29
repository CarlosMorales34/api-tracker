import { Pool, RowDataPacket } from 'mysql2/promise';
import { FixedRoutine, FixedRoutineType } from '../../../../domain/entities/fixed-routine.entity';
import { FixedRoutineRepository } from '../../../../domain/repositories/fixed-routine.repository';

interface FixedRoutineRow extends RowDataPacket {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  type: FixedRoutineType;
  linked_activity_id: string | null;
  sort_order: number;
  created_at: Date;
}

interface CountRow extends RowDataPacket {
  count: number;
}

export class MysqlFixedRoutineRepository implements FixedRoutineRepository {
  constructor(private readonly pool: Pool) {}

  async save(routine: FixedRoutine): Promise<void> {
    await this.pool.query(
      `INSERT INTO fixed_routines (id, user_id, name, icon, type, linked_activity_id, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon), type = VALUES(type),
         linked_activity_id = VALUES(linked_activity_id), sort_order = VALUES(sort_order)`,
      [
        routine.id,
        routine.userId,
        routine.name,
        routine.icon,
        routine.type,
        routine.linkedActivityId,
        routine.sortOrder,
        routine.createdAt,
      ],
    );
  }

  async findById(id: string): Promise<FixedRoutine | null> {
    const [rows] = await this.pool.query<FixedRoutineRow[]>(
      'SELECT * FROM fixed_routines WHERE id = ? LIMIT 1',
      [id],
    );
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findAllByUserId(userId: string): Promise<FixedRoutine[]> {
    const [rows] = await this.pool.query<FixedRoutineRow[]>(
      'SELECT * FROM fixed_routines WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC',
      [userId],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async countByUserId(userId: string): Promise<number> {
    const [rows] = await this.pool.query<CountRow[]>(
      'SELECT COUNT(*) AS count FROM fixed_routines WHERE user_id = ?',
      [userId],
    );
    return rows[0]?.count ?? 0;
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query('DELETE FROM fixed_routines WHERE id = ?', [id]);
  }

  private toEntity(row: FixedRoutineRow): FixedRoutine {
    return FixedRoutine.fromPersistence({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      icon: row.icon,
      type: row.type,
      linkedActivityId: row.linked_activity_id,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
    });
  }
}
