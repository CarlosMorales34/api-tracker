import { BodyMeasurement } from '../../../domain/entities/body-measurement.entity';
import { BodyMeasurementRepository } from '../../../domain/repositories/body-measurement.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { normalizeMeasuredAt } from '../../../shared/utils/measured-at';
import { UpdateBodyMeasurementDto } from '../../dtos/body-measurement.dto';

export class UpdateBodyMeasurementUseCase {
  constructor(private readonly bodyMeasurementRepository: BodyMeasurementRepository) {}

  async execute(userId: string, id: string, dto: UpdateBodyMeasurementDto): Promise<BodyMeasurement> {
    const updated = await this.bodyMeasurementRepository.update(userId, id, {
      measuredAt: dto.measuredAt !== undefined ? normalizeMeasuredAt(dto.measuredAt) : undefined,
      weightKg: dto.weightKg,
      bodyFatPercentage: dto.bodyFatPercentage,
      waistCm: dto.waistCm,
      chestCm: dto.chestCm,
      hipsCm: dto.hipsCm,
      notes: dto.notes !== undefined ? (dto.notes && dto.notes.trim().length > 0 ? dto.notes.trim() : null) : undefined,
    });
    if (!updated) {
      throw new NotFoundError('BodyMeasurement', id);
    }
    return updated;
  }
}
