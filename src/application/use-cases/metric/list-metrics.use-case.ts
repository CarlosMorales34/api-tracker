import { Metric } from '../../../domain/entities/metric.entity';
import { MetricRepository } from '../../../domain/repositories/metric.repository';

export class ListMetricsUseCase {
  constructor(private readonly metricRepository: MetricRepository) {}

  async execute(): Promise<Metric[]> {
    return this.metricRepository.findAll();
  }
}
