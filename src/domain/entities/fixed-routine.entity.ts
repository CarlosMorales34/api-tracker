export type FixedRoutineType = 'single' | 'range';

export interface FixedRoutineProps {
  id: string;
  userId: string;
  name: string;
  icon: string;
  type: FixedRoutineType;
  sortOrder: number;
  createdAt: Date;
}

export class FixedRoutine {
  private constructor(private readonly props: FixedRoutineProps) {}

  static create(props: {
    id: string;
    userId: string;
    name: string;
    icon: string;
    type: FixedRoutineType;
    sortOrder: number;
  }): FixedRoutine {
    if (!props.name.trim()) {
      throw new Error('FixedRoutine name cannot be empty');
    }
    if (!props.userId) {
      throw new Error('FixedRoutine userId is required');
    }
    if (!props.icon.trim()) {
      throw new Error('FixedRoutine icon cannot be empty');
    }

    return new FixedRoutine({ ...props, createdAt: new Date() });
  }

  static fromPersistence(props: FixedRoutineProps): FixedRoutine {
    return new FixedRoutine(props);
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

  get icon(): string {
    return this.props.icon;
  }

  get type(): FixedRoutineType {
    return this.props.type;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  applyUpdate(changes: { name?: string; icon?: string; type?: FixedRoutineType }): void {
    if (changes.name !== undefined) {
      if (!changes.name.trim()) {
        throw new Error('FixedRoutine name cannot be empty');
      }
      this.props.name = changes.name;
    }
    if (changes.icon !== undefined) {
      if (!changes.icon.trim()) {
        throw new Error('FixedRoutine icon cannot be empty');
      }
      this.props.icon = changes.icon;
    }
    if (changes.type !== undefined) {
      this.props.type = changes.type;
    }
  }

  toJSON(): { id: string; name: string; icon: string; type: FixedRoutineType; sortOrder: number } {
    return {
      id: this.props.id,
      name: this.props.name,
      icon: this.props.icon,
      type: this.props.type,
      sortOrder: this.props.sortOrder,
    };
  }
}
