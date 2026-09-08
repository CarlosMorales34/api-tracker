import { randomUUID } from 'node:crypto';
import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { BodyMeasurement } from '../../../../domain/entities/body-measurement.entity';
import {
  BodyMeasurementRepository,
  CreateBodyMeasurementInput,
  UpdateBodyMeasurementInput,
} from '../../../../domain/repositories/body-measurement.repository';

interface BodyMeasurementRow extends RowDataPacket {
  id: string;
  user_id: string;
  // String literal vía DATE_FORMAT en SELECT_COLUMNS (no un Date) -- así
  // measured_at nunca pasa por la conversión de zona horaria del driver
  // (mysql2 pool timezone: 'local'), que dependía de que el timezone del
  // servidor coincidiera con el del usuario. Ver shared/utils/measured-at.ts.
  measured_at: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  notes: string | null;
}

const SELECT_COLUMNS =
  "id, user_id, DATE_FORMAT(measured_at, '%Y-%m-%dT%H:%i:%s') AS measured_at, weight_kg, body_fat_percentage, waist_cm, chest_cm, hips_cm, notes";

// input.measuredAt es un literal local "YYYY-MM-DDTHH:mm:ss" (ver
// BodyMeasurementFields) -- se pasa como STRING al driver, nunca como Date,
// para que mysql2 lo inserte tal cual sin aplicarle su propia conversión de
// zona horaria (que solo ocurre para valores Date, no para strings).
function toSqlLiteral(measuredAt: string): string {
  return measuredAt.replace('T', ' ');
}

export class MysqlBodyMeasurementRepository implements BodyMeasurementRepository {
  constructor(private readonly pool: Pool) {}

  async create(userId: string, input: CreateBodyMeasurementInput): Promise<BodyMeasurement> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO body_measurements
         (id, user_id, measured_at, weight_kg, body_fat_percentage, waist_cm, chest_cm, hips_cm, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        toSqlLiteral(input.measuredAt),
        input.weightKg,
        input.bodyFatPercentage,
        input.waistCm,
        input.chestCm,
        input.hipsCm,
        input.notes,
      ],
    );
    const created = await this.findById(userId, id);
    if (!created) throw new Error('BodyMeasurement was created but could not be re-read');
    return created;
  }

  async update(userId: string, id: string, input: UpdateBodyMeasurementInput): Promise<BodyMeasurement | null> {
    const existing = await this.findById(userId, id);
    if (!existing) return null;

    const merged: Required<UpdateBodyMeasurementInput> = {
      measuredAt: input.measuredAt ?? existing.measuredAt,
      weightKg: input.weightKg !== undefined ? input.weightKg : existing.weightKg,
      bodyFatPercentage: input.bodyFatPercentage !== undefined ? input.bodyFatPercentage : existing.bodyFatPercentage,
      waistCm: input.waistCm !== undefined ? input.waistCm : existing.waistCm,
      chestCm: input.chestCm !== undefined ? input.chestCm : existing.chestCm,
      hipsCm: input.hipsCm !== undefined ? input.hipsCm : existing.hipsCm,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    };

    const [result] = await this.pool.query<ResultSetHeader>(
      `UPDATE body_measurements
       SET measured_at = ?, weight_kg = ?, body_fat_percentage = ?, waist_cm = ?, chest_cm = ?, hips_cm = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [
        toSqlLiteral(merged.measuredAt),
        merged.weightKg,
        merged.bodyFatPercentage,
        merged.waistCm,
        merged.chestCm,
        merged.hipsCm,
        merged.notes,
        id,
        userId,
      ],
    );
    if (result.affectedRows === 0) return null;
    return this.findById(userId, id);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.pool.query('DELETE FROM body_measurements WHERE id = ? AND user_id = ?', [id, userId]);
  }

  async findById(userId: string, id: string): Promise<BodyMeasurement | null> {
    const [rows] = await this.pool.query<BodyMeasurementRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM body_measurements WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, userId],
    );
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findByUserAndDateRange(userId: string, from: string, to: string): Promise<BodyMeasurement[]> {
    const [rows] = await this.pool.query<BodyMeasurementRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM body_measurements
       WHERE user_id = ? AND measured_at >= ? AND measured_at < DATE_ADD(?, INTERVAL 1 DAY)
       ORDER BY measured_at ASC`,
      [userId, from, to],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async findLatest(userId: string): Promise<BodyMeasurement | null> {
    const [rows] = await this.pool.query<BodyMeasurementRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM body_measurements WHERE user_id = ? ORDER BY measured_at DESC LIMIT 1`,
      [userId],
    );
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findRecent(userId: string, limit: number): Promise<BodyMeasurement[]> {
    const [rows] = await this.pool.query<BodyMeasurementRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM body_measurements WHERE user_id = ? ORDER BY measured_at DESC LIMIT ?`,
      [userId, limit],
    );
    return rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: BodyMeasurementRow): BodyMeasurement {
    return BodyMeasurement.fromPersistence({
      id: row.id,
      userId: row.user_id,
      measuredAt: row.measured_at,
      weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
      bodyFatPercentage: row.body_fat_percentage === null ? null : Number(row.body_fat_percentage),
      waistCm: row.waist_cm === null ? null : Number(row.waist_cm),
      chestCm: row.chest_cm === null ? null : Number(row.chest_cm),
      hipsCm: row.hips_cm === null ? null : Number(row.hips_cm),
      notes: row.notes,
      source: 'manual',
      createdAt: new Date(row.measured_at),
      updatedAt: new Date(row.measured_at),
    });
  }
}
