import { MetricEntry } from '../../../domain/entities/metric-entry.entity';
import { MetricEntryRepository } from '../../../domain/repositories/metric-entry.repository';
import { MetricRepository } from '../../../domain/repositories/metric.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class GetMetricHistoryUseCase {
  constructor(
    private readonly metricRepository: MetricRepository,
    private readonly metricEntryRepository: MetricEntryRepository,
  ) {}

  async execute(metricId: string): Promise<MetricEntry[]> {
    const metric = await this.metricRepository.findById(metricId);
    if (!metric) {
      throw new NotFoundError('Metric', metricId);
    }

    return this.metricEntryRepository.findByMetricId(metricId);
  }
}
