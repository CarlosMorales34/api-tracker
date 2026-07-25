export interface FinanceAnnualIncomeProps {
  id: string;
  userId: string;
  year: number;
  amount: number;
}

export class FinanceAnnualIncome {
  private constructor(private readonly props: FinanceAnnualIncomeProps) {}

  static create(props: { id: string; userId: string; year: number; amount: number }): FinanceAnnualIncome {
    if (!Number.isFinite(props.amount) || props.amount <= 0) {
      throw new Error('FinanceAnnualIncome amount must be a positive number');
    }
    if (!Number.isInteger(props.year)) {
      throw new Error('FinanceAnnualIncome year must be an integer');
    }

    return new FinanceAnnualIncome({ ...props });
  }

  static fromPersistence(props: FinanceAnnualIncomeProps): FinanceAnnualIncome {
    return new FinanceAnnualIncome(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get year(): number {
    return this.props.year;
  }

  get amount(): number {
    return this.props.amount;
  }

  toJSON(): { id: string; year: number; amount: number } {
    return { id: this.props.id, year: this.props.year, amount: this.props.amount };
  }
}
