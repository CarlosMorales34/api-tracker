export interface MetricEntryProps {
  id: string;
  metricId: string;
  value: number;
  recordedAt: Date;
  note?: string;
}

export class MetricEntry {
  private constructor(private readonly props: MetricEntryProps) {}

  static create(props: { id: string; metricId: string; value: number; recordedAt?: Date; note?: string }): MetricEntry {
    if (!Number.isFinite(props.value)) {
      throw new Error('MetricEntry value must be a finite number');
    }

    return new MetricEntry({
      id: props.id,
      metricId: props.metricId,
      value: props.value,
      recordedAt: props.recordedAt ?? new Date(),
      note: props.note,
    });
  }

  static fromPersistence(props: MetricEntryProps): MetricEntry {
    return new MetricEntry(props);
  }

  get id(): string {
    return this.props.id;
  }

  get metricId(): string {
    return this.props.metricId;
  }

  get value(): number {
    return this.props.value;
  }

  get recordedAt(): Date {
    return this.props.recordedAt;
  }

  get note(): string | undefined {
    return this.props.note;
  }

  toJSON(): MetricEntryProps {
    return { ...this.props };
  }
}
