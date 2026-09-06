export type SuggestionType =
  | 'create_routine'
  | 'update_routine'
  | 'fill_activity_fields'
  | 'suggest_category'
  | 'suggest_activity_name'
  | 'suggest_duration'
  | 'suggest_schedule'
  | 'suggest_next_occurrence';

export type SuggestionStatus = 'pending' | 'accepted' | 'accepted_with_changes' | 'dismissed' | 'expired';

export interface ActivitySuggestionProps {
  id: string;
  userId: string;
  suggestionType: SuggestionType;
  activityId: string | null;
  categoryId: string | null;
  routineId: string | null;
  suggestedActivityName: string | null;
  suggestedCategoryId: string | null;
  // Días 0-6 (Date#getUTCDay()), ej. [1,2,3,4,5] = lunes a viernes.
  suggestedDays: number[] | null;
  suggestedStartTime: string | null; // 'HH:MM'
  suggestedEndTime: string | null; // 'HH:MM'
  suggestedDurationMinutes: number | null;
  suggestedStartDate: string | null; // 'YYYY-MM-DD'
  suggestedEndDate: string | null;
  confidence: number; // 0-1
  sampleCount: number;
  distinctWeeks: number;
  reason: string;
  status: SuggestionStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

// Una "Sugerencia" es una propuesta PENDIENTE de decisión del usuario --
// nunca representa una actividad/rutina ya creada. Aceptarla no crea nada
// por sí sola (eso lo hace el flujo normal de creación de actividad/rutina,
// con los valores sugeridos como punto de partida); esta entidad solo lleva
// el ciclo de vida de la propuesta en sí. Ver SuggestionFeedback para el
// registro de qué decidió el usuario.
export class ActivitySuggestion {
  private constructor(private readonly props: ActivitySuggestionProps) {}

  static create(props: {
    id: string;
    userId: string;
    suggestionType: SuggestionType;
    activityId?: string | null;
    categoryId?: string | null;
    routineId?: string | null;
    suggestedActivityName?: string | null;
    suggestedCategoryId?: string | null;
    suggestedDays?: number[] | null;
    suggestedStartTime?: string | null;
    suggestedEndTime?: string | null;
    suggestedDurationMinutes?: number | null;
    suggestedStartDate?: string | null;
    suggestedEndDate?: string | null;
    confidence: number;
    sampleCount: number;
    distinctWeeks: number;
    reason: string;
    expiresAt?: Date | null;
  }): ActivitySuggestion {
    if (!props.userId) throw new Error('ActivitySuggestion userId is required');
    if (props.confidence < 0 || props.confidence > 1) {
      throw new Error('ActivitySuggestion confidence must be between 0 and 1');
    }
    if (!props.reason.trim()) throw new Error('ActivitySuggestion reason cannot be empty');

    const now = new Date();
    return new ActivitySuggestion({
      id: props.id,
      userId: props.userId,
      suggestionType: props.suggestionType,
      activityId: props.activityId ?? null,
      categoryId: props.categoryId ?? null,
      routineId: props.routineId ?? null,
      suggestedActivityName: props.suggestedActivityName ?? null,
      suggestedCategoryId: props.suggestedCategoryId ?? null,
      suggestedDays: props.suggestedDays ?? null,
      suggestedStartTime: props.suggestedStartTime ?? null,
      suggestedEndTime: props.suggestedEndTime ?? null,
      suggestedDurationMinutes: props.suggestedDurationMinutes ?? null,
      suggestedStartDate: props.suggestedStartDate ?? null,
      suggestedEndDate: props.suggestedEndDate ?? null,
      confidence: props.confidence,
      sampleCount: props.sampleCount,
      distinctWeeks: props.distinctWeeks,
      reason: props.reason,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt: props.expiresAt ?? null,
    });
  }

  static fromPersistence(props: ActivitySuggestionProps): ActivitySuggestion {
    return new ActivitySuggestion(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get suggestionType(): SuggestionType {
    return this.props.suggestionType;
  }

  get status(): SuggestionStatus {
    return this.props.status;
  }

  get confidence(): number {
    return this.props.confidence;
  }

  get activityId(): string | null {
    return this.props.activityId;
  }

  get categoryId(): string | null {
    return this.props.categoryId;
  }

  get routineId(): string | null {
    return this.props.routineId;
  }

  // Snapshot plano de todos los valores sugeridos -- se usa tal cual como
  // `originalValues` al registrar el SuggestionFeedback.
  suggestedValuesSnapshot(): Record<string, unknown> {
    return {
      suggestedActivityName: this.props.suggestedActivityName,
      suggestedCategoryId: this.props.suggestedCategoryId,
      suggestedDays: this.props.suggestedDays,
      suggestedStartTime: this.props.suggestedStartTime,
      suggestedEndTime: this.props.suggestedEndTime,
      suggestedDurationMinutes: this.props.suggestedDurationMinutes,
      suggestedStartDate: this.props.suggestedStartDate,
      suggestedEndDate: this.props.suggestedEndDate,
    };
  }

  private assertPending(action: string): void {
    if (this.props.status !== 'pending') {
      throw new Error(`Cannot ${action} a suggestion that is not pending (current status: ${this.props.status})`);
    }
  }

  markAccepted(): void {
    this.assertPending('accept');
    this.props.status = 'accepted';
    this.props.updatedAt = new Date();
  }

  markAcceptedWithChanges(): void {
    this.assertPending('accept');
    this.props.status = 'accepted_with_changes';
    this.props.updatedAt = new Date();
  }

  markDismissed(): void {
    this.assertPending('dismiss');
    this.props.status = 'dismissed';
    this.props.updatedAt = new Date();
  }

  markExpired(): void {
    this.assertPending('expire');
    this.props.status = 'expired';
    this.props.updatedAt = new Date();
  }

  toJSON(): Omit<ActivitySuggestionProps, 'userId'> {
    const { userId: _userId, ...rest } = this.props;
    return rest;
  }
}
