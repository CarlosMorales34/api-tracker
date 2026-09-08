import { BodyMeasurement } from '../../../domain/entities/body-measurement.entity';
import { BodyMeasurementRepository } from '../../../domain/repositories/body-measurement.repository';
import { DomainError } from '../../../domain/errors/domain.error';
import { normalizeMeasuredAt } from '../../../shared/utils/measured-at';
import { CreateBodyMeasurementDto } from '../../dtos/body-measurement.dto';

export class CreateBodyMeasurementUseCase {
  constructor(private readonly bodyMeasurementRepository: BodyMeasurementRepository) {}

  async execute(userId: string, dto: CreateBodyMeasurementDto): Promise<BodyMeasurement> {
    const metrics = [dto.weightKg, dto.bodyFatPercentage, dto.waistCm, dto.chestCm, dto.hipsCm];
    if (!metrics.some((value) => value !== null && value !== undefined)) {
      throw new DomainError('La medición necesita al menos un dato (peso, % grasa o alguna circunferencia)');
    }

    return this.bodyMeasurementRepository.create(userId, {
      measuredAt: normalizeMeasuredAt(dto.measuredAt),
      weightKg: dto.weightKg ?? null,
      bodyFatPercentage: dto.bodyFatPercentage ?? null,
      waistCm: dto.waistCm ?? null,
      chestCm: dto.chestCm ?? null,
      hipsCm: dto.hipsCm ?? null,
      notes: dto.notes && dto.notes.trim().length > 0 ? dto.notes.trim() : null,
    });
  }
}
