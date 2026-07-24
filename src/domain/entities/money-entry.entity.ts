export type MoneyEntryType = 'income' | 'expense';

export interface MoneyEntryProps {
  id: string;
  userId: string;
  type: MoneyEntryType;
  name: string;
  amount: number;
  weekStartDate: string;
}

export class MoneyEntry {
  private constructor(private props: MoneyEntryProps) {}

  static create(props: { id: string; userId: string; type: MoneyEntryType; name: string; amount: number; weekStartDate: string }): MoneyEntry {
    if (!props.name.trim()) {
      throw new Error('MoneyEntry name cannot be empty');
    }
    if (!Number.isFinite(props.amount) || props.amount <= 0) {
      throw new Error('MoneyEntry amount must be a positive number');
    }

    return new MoneyEntry({ ...props });
  }

  static fromPersistence(props: MoneyEntryProps): MoneyEntry {
    return new MoneyEntry(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): MoneyEntryType {
    return this.props.type;
  }

  get name(): string {
    return this.props.name;
  }

  get amount(): number {
    return this.props.amount;
  }

  get weekStartDate(): string {
    return this.props.weekStartDate;
  }

  applyUpdate(changes: { name?: string; amount?: number }): void {
    if (changes.name !== undefined) {
      if (!changes.name.trim()) {
        throw new Error('MoneyEntry name cannot be empty');
      }
      this.props.name = changes.name;
    }
    if (changes.amount !== undefined) {
      if (!Number.isFinite(changes.amount) || changes.amount <= 0) {
        throw new Error('MoneyEntry amount must be a positive number');
      }
      this.props.amount = changes.amount;
    }
  }

  toJSON(): { id: string; type: MoneyEntryType; name: string; amount: number; weekStartDate: string } {
    return {
      id: this.props.id,
      type: this.props.type,
      name: this.props.name,
      amount: this.props.amount,
      weekStartDate: this.props.weekStartDate,
    };
  }
}
