export type MetricUnit = 'kg' | 'lb' | 'cm' | 'min' | 'reps' | 'count' | 'percent' | 'custom';

export interface MetricProps {
  id: string;
  name: string;
  unit: MetricUnit;
  createdAt: Date;
}

export class Metric {
  private constructor(private readonly props: MetricProps) {}

  static create(props: { id: string; name: string; unit: MetricUnit }): Metric {
    if (!props.name.trim()) {
      throw new Error('Metric name cannot be empty');
    }

    return new Metric({ ...props, createdAt: new Date() });
  }

  static fromPersistence(props: MetricProps): Metric {
    return new Metric(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get unit(): MetricUnit {
    return this.props.unit;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON(): MetricProps {
    return { ...this.props };
  }
}
