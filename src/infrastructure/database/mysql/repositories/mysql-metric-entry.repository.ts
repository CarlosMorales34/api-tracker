import { Pool, RowDataPacket } from 'mysql2/promise';
import { MetricEntry } from '../../../../domain/entities/metric-entry.entity';
import { MetricEntryRepository } from '../../../../domain/repositories/metric-entry.repository';

interface MetricEntryRow extends RowDataPacket {
  id: string;
  metric_id: string;
  value: number;
  note: string | null;
  recorded_at: Date;
}

export class MysqlMetricEntryRepository implements MetricEntryRepository {
  constructor(private readonly pool: Pool) {}

  async save(entry: MetricEntry): Promise<void> {
    const { id, metricId, value, note, recordedAt } = entry.toJSON();
    await this.pool.query(
      `INSERT INTO metric_entries (id, metric_id, value, note, recorded_at) VALUES (?, ?, ?, ?, ?)`,
      [id, metricId, value, note ?? null, recordedAt],
    );
  }

  async findByMetricId(metricId: string): Promise<MetricEntry[]> {
    const [rows] = await this.pool.query<MetricEntryRow[]>(
      'SELECT * FROM metric_entries WHERE metric_id = ? ORDER BY recorded_at DESC',
      [metricId],
    );
    return rows.map((row) =>
      MetricEntry.fromPersistence({
        id: row.id,
        metricId: row.metric_id,
        value: row.value,
        note: row.note ?? undefined,
        recordedAt: new Date(row.recorded_at),
      }),
    );
  }
}
