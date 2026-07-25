export interface CreditCardProps {
  id: string;
  userId: string;
  name: string;
  creditLimit: number;
  dueDay: number;
  amountOwed: number;
}

export class CreditCard {
  private constructor(private props: CreditCardProps) {}

  static create(props: { id: string; userId: string; name: string; creditLimit: number; dueDay: number; amountOwed: number }): CreditCard {
    if (!props.name.trim()) {
      throw new Error('CreditCard name cannot be empty');
    }
    if (!Number.isFinite(props.creditLimit) || props.creditLimit <= 0) {
      throw new Error('CreditCard creditLimit must be a positive number');
    }
    if (!Number.isInteger(props.dueDay) || props.dueDay < 1 || props.dueDay > 31) {
      throw new Error('CreditCard dueDay must be between 1 and 31');
    }
    if (!Number.isFinite(props.amountOwed) || props.amountOwed < 0) {
      throw new Error('CreditCard amountOwed must be a non-negative number');
    }

    return new CreditCard({ ...props });
  }

  static fromPersistence(props: CreditCardProps): CreditCard {
    return new CreditCard(props);
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

  get creditLimit(): number {
    return this.props.creditLimit;
  }

  get dueDay(): number {
    return this.props.dueDay;
  }

  get amountOwed(): number {
    return this.props.amountOwed;
  }

  applyUpdate(changes: { name?: string; creditLimit?: number; dueDay?: number; amountOwed?: number }): void {
    if (changes.name !== undefined) {
      if (!changes.name.trim()) {
        throw new Error('CreditCard name cannot be empty');
      }
      this.props.name = changes.name;
    }
    if (changes.creditLimit !== undefined) {
      if (!Number.isFinite(changes.creditLimit) || changes.creditLimit <= 0) {
        throw new Error('CreditCard creditLimit must be a positive number');
      }
      this.props.creditLimit = changes.creditLimit;
    }
    if (changes.dueDay !== undefined) {
      if (!Number.isInteger(changes.dueDay) || changes.dueDay < 1 || changes.dueDay > 31) {
        throw new Error('CreditCard dueDay must be between 1 and 31');
      }
      this.props.dueDay = changes.dueDay;
    }
    if (changes.amountOwed !== undefined) {
      if (!Number.isFinite(changes.amountOwed) || changes.amountOwed < 0) {
        throw new Error('CreditCard amountOwed must be a non-negative number');
      }
      this.props.amountOwed = changes.amountOwed;
    }
  }

  toJSON(): { id: string; name: string; creditLimit: number; dueDay: number; amountOwed: number; available: number } {
    return {
      id: this.props.id,
      name: this.props.name,
      creditLimit: this.props.creditLimit,
      dueDay: this.props.dueDay,
      amountOwed: this.props.amountOwed,
      available: Math.round((this.props.creditLimit - this.props.amountOwed) * 100) / 100,
    };
  }
}
