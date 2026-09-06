export interface BodyMeasurementProps {
  id: string;
  userId: string;
  measuredAt: Date;
  weightKg: number | null;
  bodyFatPercentage: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipsCm: number | null;
  notes: string | null;
  source: 'manual';
  createdAt: Date;
  updatedAt: Date;
}

export type BodyMeasurementMetrics = Pick<
  BodyMeasurementProps,
  'weightKg' | 'bodyFatPercentage' | 'waistCm' | 'chestCm' | 'hipsCm'
>;

// Una medición = un momento puntual con 1+ métricas (peso, % grasa,
// circunferencias) -- reemplaza el modelo mensual de weight_entries. Todas
// las métricas son opcionales individualmente (una medición puede ser solo
// cintura, por ejemplo), pero se exige al menos una -- una fila sin ningún
// dato no tiene sentido.
export class BodyMeasurement {
  private constructor(private readonly props: BodyMeasurementProps) {}

  static create(props: {
    id: string;
    userId: string;
    measuredAt: Date;
    weightKg?: number | null;
    bodyFatPercentage?: number | null;
    waistCm?: number | null;
    chestCm?: number | null;
    hipsCm?: number | null;
    notes?: string | null;
  }): BodyMeasurement {
    if (!props.userId) {
      throw new Error('BodyMeasurement userId is required');
    }
    const metrics = [props.weightKg, props.bodyFatPercentage, props.waistCm, props.chestCm, props.hipsCm];
    if (!metrics.some((value) => value !== null && value !== undefined)) {
      throw new Error('BodyMeasurement needs at least one metric');
    }

    const now = new Date();
    return new BodyMeasurement({
      id: props.id,
      userId: props.userId,
      measuredAt: props.measuredAt,
      weightKg: props.weightKg ?? null,
      bodyFatPercentage: props.bodyFatPercentage ?? null,
      waistCm: props.waistCm ?? null,
      chestCm: props.chestCm ?? null,
      hipsCm: props.hipsCm ?? null,
      notes: props.notes ?? null,
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: BodyMeasurementProps): BodyMeasurement {
    return new BodyMeasurement(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get measuredAt(): Date {
    return this.props.measuredAt;
  }

  get weightKg(): number | null {
    return this.props.weightKg;
  }

  get bodyFatPercentage(): number | null {
    return this.props.bodyFatPercentage;
  }

  get waistCm(): number | null {
    return this.props.waistCm;
  }

  get chestCm(): number | null {
    return this.props.chestCm;
  }

  get hipsCm(): number | null {
    return this.props.hipsCm;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  applyUpdate(changes: {
    measuredAt?: Date;
    weightKg?: number | null;
    bodyFatPercentage?: number | null;
    waistCm?: number | null;
    chestCm?: number | null;
    hipsCm?: number | null;
    notes?: string | null;
  }): void {
    if (changes.measuredAt !== undefined) this.props.measuredAt = changes.measuredAt;
    if (changes.weightKg !== undefined) this.props.weightKg = changes.weightKg;
    if (changes.bodyFatPercentage !== undefined) this.props.bodyFatPercentage = changes.bodyFatPercentage;
    if (changes.waistCm !== undefined) this.props.waistCm = changes.waistCm;
    if (changes.chestCm !== undefined) this.props.chestCm = changes.chestCm;
    if (changes.hipsCm !== undefined) this.props.hipsCm = changes.hipsCm;
    if (changes.notes !== undefined) this.props.notes = changes.notes;
  }

  toJSON() {
    return {
      id: this.props.id,
      measuredAt: this.props.measuredAt.toISOString(),
      weightKg: this.props.weightKg,
      bodyFatPercentage: this.props.bodyFatPercentage,
      waistCm: this.props.waistCm,
      chestCm: this.props.chestCm,
      hipsCm: this.props.hipsCm,
      notes: this.props.notes,
      source: this.props.source,
    };
  }
}
