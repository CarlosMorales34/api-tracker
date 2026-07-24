export interface AnnualCounterProps {
  id: string;
  userId: string;
  name: string;
  year: number;
  value: number;
}

export class AnnualCounter {
  private constructor(private readonly props: AnnualCounterProps) {}

  static create(props: { id: string; userId: string; name: string; year: number; value: number }): AnnualCounter {
    if (!props.name.trim()) {
      throw new Error('AnnualCounter name cannot be empty');
    }
    if (!Number.isInteger(props.value) || props.value < 0) {
      throw new Error('AnnualCounter value must be a non-negative integer');
    }

    return new AnnualCounter({ ...props });
  }

  static fromPersistence(props: AnnualCounterProps): AnnualCounter {
    return new AnnualCounter(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get year(): number {
    return this.props.year;
  }

  get value(): number {
    return this.props.value;
  }

  toJSON(): { id: string; name: string; year: number; value: number } {
    return { id: this.props.id, name: this.props.name, year: this.props.year, value: this.props.value };
  }
}
