import { MetricUnit } from '../../domain/entities/metric.entity';

export interface CreateMetricDto {
  name: string;
  unit: MetricUnit;
}
