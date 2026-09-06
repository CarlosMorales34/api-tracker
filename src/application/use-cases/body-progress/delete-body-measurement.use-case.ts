import { BodyMeasurementRepository } from '../../../domain/repositories/body-measurement.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteBodyMeasurementUseCase {
  constructor(private readonly bodyMeasurementRepository: BodyMeasurementRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const existing = await this.bodyMeasurementRepository.findById(userId, id);
    if (!existing) {
      throw new NotFoundError('BodyMeasurement', id);
    }
    await this.bodyMeasurementRepository.delete(userId, id);
  }
}
