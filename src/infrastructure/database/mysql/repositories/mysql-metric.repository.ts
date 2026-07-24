import { Pool, RowDataPacket } from 'mysql2/promise';
import { Metric, MetricUnit } from '../../../../domain/entities/metric.entity';
import { MetricRepository } from '../../../../domain/repositories/metric.repository';

interface MetricRow extends RowDataPacket {
  id: string;
  name: string;
  unit: MetricUnit;
  created_at: Date;
}

export class MysqlMetricRepository implements MetricRepository {
  constructor(private readonly pool: Pool) {}

  async save(metric: Metric): Promise<void> {
    const { id, name, unit, createdAt } = metric.toJSON();
    await this.pool.query(
      `INSERT INTO metrics (id, name, unit, created_at) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), unit = VALUES(unit)`,
      [id, name, unit, createdAt],
    );
  }

  async findById(id: string): Promise<Metric | null> {
    const [rows] = await this.pool.query<MetricRow[]>('SELECT * FROM metrics WHERE id = ? LIMIT 1', [id]);
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findAll(): Promise<Metric[]> {
    const [rows] = await this.pool.query<MetricRow[]>('SELECT * FROM metrics ORDER BY created_at DESC');
    return rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: MetricRow): Metric {
    return Metric.fromPersistence({
      id: row.id,
      name: row.name,
      unit: row.unit,
      createdAt: new Date(row.created_at),
    });
  }
}
