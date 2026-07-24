import { randomUUID } from 'node:crypto';
import { MetricEntry } from '../../../domain/entities/metric-entry.entity';
import { MetricEntryRepository } from '../../../domain/repositories/metric-entry.repository';
import { MetricRepository } from '../../../domain/repositories/metric.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { LogMetricEntryDto } from '../../dtos/log-metric-entry.dto';

export class LogMetricEntryUseCase {
  constructor(
    private readonly metricRepository: MetricRepository,
    private readonly metricEntryRepository: MetricEntryRepository,
  ) {}

  async execute(dto: LogMetricEntryDto): Promise<MetricEntry> {
    const metric = await this.metricRepository.findById(dto.metricId);
    if (!metric) {
      throw new NotFoundError('Metric', dto.metricId);
    }

    const entry = MetricEntry.create({
      id: randomUUID(),
      metricId: dto.metricId,
      value: dto.value,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
      note: dto.note,
    });

    await this.metricEntryRepository.save(entry);
    return entry;
  }
}
