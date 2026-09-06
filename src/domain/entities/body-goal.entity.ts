export type BodyGoalType = 'lose' | 'gain' | 'maintain' | 'recomp';

export interface BodyGoalProps {
  id: string;
  userId: string;
  goalType: BodyGoalType;
  startWeightKg: number;
  // Nullable: 'maintain'/'recomp' no siempre tienen un único número objetivo
  // -- lo que importa ahí es el rango/la composición, no un peso final.
  targetWeightKg: number | null;
  startDate: string; // YYYY-MM-DD
  targetDate: string | null;
  // Cambiar de meta crea una fila nueva (BodyGoalRepository.create) y
  // desactiva la anterior -- nunca se sobreescribe una meta pasada, así se
  // conserva el historial completo de objetivos.
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class BodyGoal {
  private constructor(private readonly props: BodyGoalProps) {}

  static create(props: {
    id: string;
    userId: string;
    goalType: BodyGoalType;
    startWeightKg: number;
    targetWeightKg?: number | null;
    startDate: string;
    targetDate?: string | null;
  }): BodyGoal {
    if (!props.userId) {
      throw new Error('BodyGoal userId is required');
    }
    if (props.startWeightKg <= 0) {
      throw new Error('BodyGoal startWeightKg must be positive');
    }
    if ((props.goalType === 'lose' || props.goalType === 'gain') && !props.targetWeightKg) {
      throw new Error('BodyGoal targetWeightKg is required for lose/gain goals');
    }

    const now = new Date();
    return new BodyGoal({
      id: props.id,
      userId: props.userId,
      goalType: props.goalType,
      startWeightKg: props.startWeightKg,
      targetWeightKg: props.targetWeightKg ?? null,
      startDate: props.startDate,
      targetDate: props.targetDate ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: BodyGoalProps): BodyGoal {
    return new BodyGoal(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get goalType(): BodyGoalType {
    return this.props.goalType;
  }

  get startWeightKg(): number {
    return this.props.startWeightKg;
  }

  get targetWeightKg(): number | null {
    return this.props.targetWeightKg;
  }

  get startDate(): string {
    return this.props.startDate;
  }

  get targetDate(): string | null {
    return this.props.targetDate;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  toJSON() {
    return {
      id: this.props.id,
      goalType: this.props.goalType,
      startWeightKg: this.props.startWeightKg,
      targetWeightKg: this.props.targetWeightKg,
      startDate: this.props.startDate,
      targetDate: this.props.targetDate,
      isActive: this.props.isActive,
    };
  }
}
