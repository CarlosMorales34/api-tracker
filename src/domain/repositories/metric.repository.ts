import { Metric } from '../entities/metric.entity';

export interface MetricRepository {
  save(metric: Metric): Promise<void>;
  findById(id: string): Promise<Metric | null>;
  findAll(): Promise<Metric[]>;
}
