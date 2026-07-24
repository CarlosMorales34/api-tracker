import { randomUUID } from 'node:crypto';
import { Metric } from '../../../domain/entities/metric.entity';
import { MetricRepository } from '../../../domain/repositories/metric.repository';
import { CreateMetricDto } from '../../dtos/create-metric.dto';

export class CreateMetricUseCase {
  constructor(private readonly metricRepository: MetricRepository) {}

  async execute(dto: CreateMetricDto): Promise<Metric> {
    const metric = Metric.create({ id: randomUUID(), name: dto.name, unit: dto.unit });
    await this.metricRepository.save(metric);
    return metric;
  }
}
