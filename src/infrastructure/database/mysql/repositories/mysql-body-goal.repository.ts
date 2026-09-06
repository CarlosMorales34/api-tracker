import { randomUUID } from 'node:crypto';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { BodyGoal, BodyGoalType } from '../../../../domain/entities/body-goal.entity';
import { BodyGoalRepository, CreateBodyGoalInput } from '../../../../domain/repositories/body-goal.repository';

interface BodyGoalRow extends RowDataPacket {
  id: string;
  user_id: string;
  goal_type: BodyGoalType;
  start_weight_kg: number;
  target_weight_kg: number | null;
  start_date: string;
  target_date: string | null;
  is_active: number;
}

const SELECT_COLUMNS =
  'id, user_id, goal_type, start_weight_kg, target_weight_kg, start_date, target_date, is_active';

export class MysqlBodyGoalRepository implements BodyGoalRepository {
  constructor(private readonly pool: Pool) {}

  async findActive(userId: string): Promise<BodyGoal | null> {
    const [rows] = await this.pool.query<BodyGoalRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM body_goals WHERE user_id = ? AND is_active = TRUE LIMIT 1`,
      [userId],
    );
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findHistory(userId: string): Promise<BodyGoal[]> {
    const [rows] = await this.pool.query<BodyGoalRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM body_goals WHERE user_id = ? ORDER BY start_date DESC, created_at DESC`,
      [userId],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async create(userId: string, input: CreateBodyGoalInput): Promise<BodyGoal> {
    const id = randomUUID();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      // Una sola meta activa por usuario -- desactivar la anterior y crear
      // la nueva es atómico, para no dejar dos metas activas si algo falla
      // a la mitad.
      await connection.query('UPDATE body_goals SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE', [
        userId,
      ]);
      await connection.query(
        `INSERT INTO body_goals (id, user_id, goal_type, start_weight_kg, target_weight_kg, start_date, target_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [id, userId, input.goalType, input.startWeightKg, input.targetWeightKg, input.startDate, input.targetDate],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const created = await this.findActive(userId);
    if (!created) throw new Error('BodyGoal was created but could not be re-read');
    return created;
  }

  async deactivateActive(userId: string): Promise<void> {
    await this.pool.query('UPDATE body_goals SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE', [
      userId,
    ]);
  }

  private toEntity(row: BodyGoalRow): BodyGoal {
    return BodyGoal.fromPersistence({
      id: row.id,
      userId: row.user_id,
      goalType: row.goal_type,
      startWeightKg: Number(row.start_weight_kg),
      targetWeightKg: row.target_weight_kg === null ? null : Number(row.target_weight_kg),
      startDate: row.start_date,
      targetDate: row.target_date,
      isActive: Boolean(row.is_active),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
