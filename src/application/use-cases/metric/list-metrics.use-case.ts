import { Metric } from '../../../domain/entities/metric.entity';
import { MetricRepository } from '../../../domain/repositories/metric.repository';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface ListMetricsPagination {
  limit?: number;
  offset?: number;
}

export class ListMetricsUseCase {
  constructor(private readonly metricRepository: MetricRepository) {}

  async execute(userId: string, pagination: ListMetricsPagination = {}): Promise<Metric[]> {
    const limit = clamp(pagination.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = Math.max(pagination.offset ?? 0, 0);
    return this.metricRepository.findAllByUserId(userId, limit, offset);
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
