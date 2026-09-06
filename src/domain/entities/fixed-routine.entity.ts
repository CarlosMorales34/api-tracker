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
  // null = aplica todos los días (comportamiento histórico, preservado para
  // toda rutina creada antes de esta extensión). No-null = solo esos días
  // (0-6, Date#getUTCDay()) -- ej. una rutina creada desde una sugerencia de
  // "Programar lunes a viernes" trae [1,2,3,4,5].
  weekdays: number[] | null;
  // null = sin cota (comportamiento histórico). Permite "vigente desde" y
  // "vigente hasta" sin afectar registros pasados -- crear/mover estas
  // fechas nunca toca routine_logs ya capturados, esos siguen existiendo
  // por su propia fecha sin importar el rango vigente actual de la rutina.
  startDate: string | null;
  endDate: string | null;
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
    weekdays?: number[] | null;
    startDate?: string | null;
    endDate?: string | null;
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
    if (props.startDate && props.endDate && props.endDate < props.startDate) {
      throw new Error('FixedRoutine endDate cannot be before startDate');
    }

    return new FixedRoutine({
      ...props,
      linkedActivityId: props.linkedActivityId ?? null,
      isSleep: props.isSleep ?? false,
      weekdays: props.weekdays ?? null,
      startDate: props.startDate ?? null,
      endDate: props.endDate ?? null,
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

  get weekdays(): number[] | null {
    return this.props.weekdays;
  }

  get startDate(): string | null {
    return this.props.startDate;
  }

  get endDate(): string | null {
    return this.props.endDate;
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
    weekdays?: number[] | null;
    startDate?: string | null;
    endDate?: string | null;
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
    if (changes.weekdays !== undefined) {
      this.props.weekdays = changes.weekdays;
    }
    if (changes.startDate !== undefined) {
      this.props.startDate = changes.startDate;
    }
    if (changes.endDate !== undefined) {
      this.props.endDate = changes.endDate;
    }
    if (this.props.startDate && this.props.endDate && this.props.endDate < this.props.startDate) {
      throw new Error('FixedRoutine endDate cannot be before startDate');
    }
  }

  toJSON(): {
    id: string;
    name: string;
    icon: string;
    type: FixedRoutineType;
    linkedActivityId: string | null;
    isSleep: boolean;
    weekdays: number[] | null;
    startDate: string | null;
    endDate: string | null;
    sortOrder: number;
  } {
    return {
      id: this.props.id,
      name: this.props.name,
      icon: this.props.icon,
      type: this.props.type,
      linkedActivityId: this.props.linkedActivityId,
      isSleep: this.props.isSleep,
      weekdays: this.props.weekdays,
      startDate: this.props.startDate,
      endDate: this.props.endDate,
      sortOrder: this.props.sortOrder,
    };
  }
}
