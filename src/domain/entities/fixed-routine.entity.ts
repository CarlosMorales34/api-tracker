export type FixedRoutineType = 'single' | 'range';

export interface FixedRoutineProps {
  id: string;
  userId: string;
  name: string;
  icon: string;
  type: FixedRoutineType;
  linkedActivityId: string | null;
  // Marca esta rutina como "sueño" para el indicador de productividad
  // diaria (ver get-daily-productivity.use-case.ts) -- puede haber más de
  // una si el usuario quiere separar ej. siesta + sueño nocturno.
  isSleep: boolean;
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
    linkedActivityId?: string | null;
    isSleep?: boolean;
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

    return new FixedRoutine({
      ...props,
      linkedActivityId: props.linkedActivityId ?? null,
      isSleep: props.isSleep ?? false,
      createdAt: new Date(),
    });
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

  get linkedActivityId(): string | null {
    return this.props.linkedActivityId;
  }

  get isSleep(): boolean {
    return this.props.isSleep;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  applyUpdate(changes: {
    name?: string;
    icon?: string;
    type?: FixedRoutineType;
    linkedActivityId?: string | null;
    isSleep?: boolean;
  }): void {
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
    if (changes.linkedActivityId !== undefined) {
      this.props.linkedActivityId = changes.linkedActivityId;
    }
    if (changes.isSleep !== undefined) {
      this.props.isSleep = changes.isSleep;
    }
  }

  toJSON(): {
    id: string;
    name: string;
    icon: string;
    type: FixedRoutineType;
    linkedActivityId: string | null;
    isSleep: boolean;
    sortOrder: number;
  } {
    return {
      id: this.props.id,
      name: this.props.name,
      icon: this.props.icon,
      type: this.props.type,
      linkedActivityId: this.props.linkedActivityId,
      isSleep: this.props.isSleep,
      sortOrder: this.props.sortOrder,
    };
  }
}
