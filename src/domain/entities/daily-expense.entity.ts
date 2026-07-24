export interface DailyExpenseProps {
  id: string;
  userId: string;
  name: string;
  amount: number;
  expenseDate: string;
}

export class DailyExpense {
  private constructor(private props: DailyExpenseProps) {}

  static create(props: { id: string; userId: string; name: string; amount: number; expenseDate: string }): DailyExpense {
    if (!props.name.trim()) {
      throw new Error('DailyExpense name cannot be empty');
    }
    if (!Number.isFinite(props.amount) || props.amount <= 0) {
      throw new Error('DailyExpense amount must be a positive number');
    }

    return new DailyExpense({ ...props });
  }

  static fromPersistence(props: DailyExpenseProps): DailyExpense {
    return new DailyExpense(props);
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

  get expenseDate(): string {
    return this.props.expenseDate;
  }

  applyUpdate(changes: { name?: string; amount?: number }): void {
    if (changes.name !== undefined) {
      if (!changes.name.trim()) {
        throw new Error('DailyExpense name cannot be empty');
      }
      this.props.name = changes.name;
    }
    if (changes.amount !== undefined) {
      if (!Number.isFinite(changes.amount) || changes.amount <= 0) {
        throw new Error('DailyExpense amount must be a positive number');
      }
      this.props.amount = changes.amount;
    }
  }

  toJSON(): { id: string; name: string; amount: number; expenseDate: string } {
    return { id: this.props.id, name: this.props.name, amount: this.props.amount, expenseDate: this.props.expenseDate };
  }
}
