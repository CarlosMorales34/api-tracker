import { MetricEntry } from '../entities/metric-entry.entity';

export interface MetricEntryRepository {
  save(entry: MetricEntry): Promise<void>;
  findByMetricId(metricId: string): Promise<MetricEntry[]>;
}
