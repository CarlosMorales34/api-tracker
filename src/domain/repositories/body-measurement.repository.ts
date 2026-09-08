import { BodyMeasurement } from '../entities/body-measurement.entity';

export interface BodyMeasurementFields {
  // Literal local "YYYY-MM-DDTHH:mm:ss", nunca un Date -- ver
  // shared/utils/measured-at.ts para el porqué.
  measuredAt: string;
  weightKg: number | null;
  bodyFatPercentage: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipsCm: number | null;
  notes: string | null;
}

export type CreateBodyMeasurementInput = BodyMeasurementFields;
export type UpdateBodyMeasurementInput = Partial<BodyMeasurementFields>;

export interface BodyMeasurementRepository {
  create(userId: string, input: CreateBodyMeasurementInput): Promise<BodyMeasurement>;
  // null = no existe o no pertenece a userId (ownership check en la query).
  update(userId: string, id: string, input: UpdateBodyMeasurementInput): Promise<BodyMeasurement | null>;
  delete(userId: string, id: string): Promise<void>;
  findById(userId: string, id: string): Promise<BodyMeasurement | null>;
  // from/to inclusive, fechas YYYY-MM-DD -- para el selector de período
  // (1M/3M/1A) del gráfico de tendencia.
  findByUserAndDateRange(userId: string, from: string, to: string): Promise<BodyMeasurement[]>;
  findLatest(userId: string): Promise<BodyMeasurement | null>;
  findRecent(userId: string, limit: number): Promise<BodyMeasurement[]>;
}
