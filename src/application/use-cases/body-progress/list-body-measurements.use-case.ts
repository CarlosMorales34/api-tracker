import { BodyMeasurement } from '../../../domain/entities/body-measurement.entity';
import { BodyMeasurementRepository } from '../../../domain/repositories/body-measurement.repository';

export class ListBodyMeasurementsUseCase {
  constructor(private readonly bodyMeasurementRepository: BodyMeasurementRepository) {}

  async execute(userId: string, from: string, to: string): Promise<BodyMeasurement[]> {
    return this.bodyMeasurementRepository.findByUserAndDateRange(userId, from, to);
  }
}
