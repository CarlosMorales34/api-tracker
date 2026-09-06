export interface CreateBodyMeasurementDto {
  measuredAt: string; // ISO datetime
  weightKg?: number | null;
  bodyFatPercentage?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  hipsCm?: number | null;
  notes?: string | null;
}

export interface UpdateBodyMeasurementDto {
  measuredAt?: string;
  weightKg?: number | null;
  bodyFatPercentage?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  hipsCm?: number | null;
  notes?: string | null;
}
