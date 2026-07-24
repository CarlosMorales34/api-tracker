export interface WeightEntryProps {
  userId: string;
  year: number;
  month: number;
  value: number | null;
  note: string | null;
}

export class WeightEntry {
  private constructor(private readonly props: WeightEntryProps) {}

  static fromPersistence(props: WeightEntryProps): WeightEntry {
    return new WeightEntry(props);
  }

  static empty(userId: string, year: number, month: number): WeightEntry {
    return new WeightEntry({ userId, year, month, value: null, note: null });
  }

  get userId(): string {
    return this.props.userId;
  }

  get year(): number {
    return this.props.year;
  }

  get month(): number {
    return this.props.month;
  }

  get value(): number | null {
    return this.props.value;
  }

  get note(): string | null {
    return this.props.note;
  }

  toJSON(): { year: number; month: number; value: number | null; note: string | null } {
    return { year: this.props.year, month: this.props.month, value: this.props.value, note: this.props.note };
  }
}
