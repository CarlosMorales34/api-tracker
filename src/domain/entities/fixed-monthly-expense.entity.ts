export interface FixedMonthlyExpenseProps {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dayOfMonth: number | null;
  description: string | null;
}

export class FixedMonthlyExpense {
  private constructor(private props: FixedMonthlyExpenseProps) {}

  static create(props: {
    id: string;
    userId: string;
    name: string;
    amount: number;
    dayOfMonth: number | null;
    description: string | null;
  }): FixedMonthlyExpense {
    if (!props.name.trim()) {
      throw new Error('FixedMonthlyExpense name cannot be empty');
    }
    if (!Number.isFinite(props.amount) || props.amount <= 0) {
      throw new Error('FixedMonthlyExpense amount must be a positive number');
    }
    if (props.dayOfMonth !== null && (!Number.isInteger(props.dayOfMonth) || props.dayOfMonth < 1 || props.dayOfMonth > 31)) {
      throw new Error('FixedMonthlyExpense dayOfMonth must be between 1 and 31');
    }

    return new FixedMonthlyExpense({ ...props });
  }

  static fromPersistence(props: FixedMonthlyExpenseProps): FixedMonthlyExpense {
    return new FixedMonthlyExpense(props);
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

  get amount(): number {
    return this.props.amount;
  }

  get dayOfMonth(): number | null {
    return this.props.dayOfMonth;
  }

  get description(): string | null {
    return this.props.description;
  }

  applyUpdate(changes: { name?: string; amount?: number; dayOfMonth?: number | null; description?: string | null }): void {
    if (changes.name !== undefined) {
      if (!changes.name.trim()) {
        throw new Error('FixedMonthlyExpense name cannot be empty');
      }
      this.props.name = changes.name;
    }
    if (changes.amount !== undefined) {
      if (!Number.isFinite(changes.amount) || changes.amount <= 0) {
        throw new Error('FixedMonthlyExpense amount must be a positive number');
      }
      this.props.amount = changes.amount;
    }
    if (changes.dayOfMonth !== undefined) {
      if (changes.dayOfMonth !== null && (!Number.isInteger(changes.dayOfMonth) || changes.dayOfMonth < 1 || changes.dayOfMonth > 31)) {
        throw new Error('FixedMonthlyExpense dayOfMonth must be between 1 and 31');
      }
      this.props.dayOfMonth = changes.dayOfMonth;
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description;
    }
  }

  toJSON(): { id: string; name: string; amount: number; dayOfMonth: number | null; description: string | null } {
    return {
      id: this.props.id,
      name: this.props.name,
      amount: this.props.amount,
      dayOfMonth: this.props.dayOfMonth,
      description: this.props.description,
    };
  }
}
