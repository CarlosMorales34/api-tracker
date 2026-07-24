export interface FixedMonthlyExpenseProps {
  id: string;
  userId: string;
  name: string;
  amount: number;
}

export class FixedMonthlyExpense {
  private constructor(private props: FixedMonthlyExpenseProps) {}

  static create(props: { id: string; userId: string; name: string; amount: number }): FixedMonthlyExpense {
    if (!props.name.trim()) {
      throw new Error('FixedMonthlyExpense name cannot be empty');
    }
    if (!Number.isFinite(props.amount) || props.amount <= 0) {
      throw new Error('FixedMonthlyExpense amount must be a positive number');
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

  applyUpdate(changes: { name?: string; amount?: number }): void {
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
  }

  toJSON(): { id: string; name: string; amount: number } {
    return { id: this.props.id, name: this.props.name, amount: this.props.amount };
  }
}
