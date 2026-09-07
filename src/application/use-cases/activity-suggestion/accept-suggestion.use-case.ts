import { randomUUID } from 'node:crypto';
import { ActivitySuggestion } from '../../../domain/entities/activity-suggestion.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { ActivityRepository } from '../../../domain/repositories/activity.repository';
import { ActivitySuggestionRepository } from '../../../domain/repositories/activity-suggestion.repository';
import { SuggestionFeedbackRepository } from '../../../domain/repositories/suggestion-feedback.repository';
import { parseDateOnly } from '../../../shared/utils/week';
import { CreateFixedRoutineUseCase } from '../fixed-routine/create-fixed-routine.use-case';
import { PutRoutineLogUseCase } from '../fixed-routine/put-routine-log.use-case';
import { UpdateFixedRoutineUseCase } from '../fixed-routine/update-fixed-routine.use-case';

export interface AcceptSuggestionInput {
  // Presente solo si el usuario editó algo antes de aceptar (editor de
  // sugerencias) -- si coincide exactamente con lo sugerido, se trata igual
  // que una aceptación simple. Para 'create_routine' se leen además
  // routineName/suggestedDays/suggestedStartDate/suggestedEndDate como
  // overrides puntuales de la rutina a crear.
  finalValues?: Record<string, unknown>;
}

function valuesDiffer(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function asStringOrNull(value: unknown, fallback: string | null): string | null {
  if (value === undefined) return fallback;
  return typeof value === 'string' || value === null ? value : fallback;
}

function asWeekdaysOrNull(value: unknown, fallback: number[] | null): number[] | null {
  if (value === undefined) return fallback;
  if (value === null) return null;
  return Array.isArray(value) && value.every((day) => typeof day === 'number') ? (value as number[]) : fallback;
}

function asTimeOrNull(value: unknown, fallback: string | null): string | null {
  if (value === undefined) return fallback;
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function asDateOrNull(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

// El usuario confirma o corrige la sugerencia. Para la mayoría de los tipos
// esto NO crea nada por sí solo -- el front usa los valores (aceptados o
// editados) como punto de partida del formulario normal. Dos excepciones
// reales: 'create_routine' materializa una FixedRoutine nueva
// (CreateFixedRoutineUseCase), y 'update_routine' actualiza los `weekdays`
// de una rutina YA existente (UpdateFixedRoutineUseCase) -- en ambos casos
// porque esa es exactamente la acción que el usuario está confirmando, no
// un efecto colateral. Nunca toca actividades ni rutinas de otro tipo de
// sugerencia.
export class AcceptSuggestionUseCase {
  constructor(
    private readonly activitySuggestionRepository: ActivitySuggestionRepository,
    private readonly suggestionFeedbackRepository: SuggestionFeedbackRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly createFixedRoutineUseCase: CreateFixedRoutineUseCase,
    private readonly updateFixedRoutineUseCase: UpdateFixedRoutineUseCase,
    private readonly putRoutineLogUseCase: PutRoutineLogUseCase,
  ) {}

  async execute(userId: string, suggestionId: string, input: AcceptSuggestionInput): Promise<void> {
    const suggestion = await this.activitySuggestionRepository.findById(suggestionId);
    if (!suggestion || suggestion.userId !== userId) {
      throw new NotFoundError('ActivitySuggestion', suggestionId);
    }

    const originalValues = suggestion.suggestedValuesSnapshot();
    const finalValues = input.finalValues;
    const hasChanges =
      finalValues !== undefined &&
      Object.keys(finalValues).some((key) => valuesDiffer(finalValues[key], originalValues[key]));

    if (hasChanges) {
      suggestion.markAcceptedWithChanges();
    } else {
      suggestion.markAccepted();
    }
    await this.activitySuggestionRepository.updateStatus(suggestion.id, suggestion.status);

    if (suggestion.suggestionType === 'create_routine') {
      await this.createRoutineFromSuggestion(userId, suggestion, finalValues ?? {});
    } else if (suggestion.suggestionType === 'update_routine') {
      await this.updateRoutineFromSuggestion(userId, suggestion, finalValues ?? {});
    }

    await this.suggestionFeedbackRepository.save({
      id: randomUUID(),
      suggestionId: suggestion.id,
      userId,
      action: hasChanges ? 'accepted_with_changes' : 'accepted',
      originalValues,
      finalValues: hasChanges ? finalValues! : null,
      createdAt: new Date(),
    });
  }

  private async createRoutineFromSuggestion(
    userId: string,
    suggestion: ActivitySuggestion,
    overrides: Record<string, unknown>,
  ): Promise<void> {
    const activityId = suggestion.activityId;
    if (!activityId) return; // no debería ocurrir para este tipo, pero por seguridad no crea nada a ciegas

    const snapshot = suggestion.suggestedValuesSnapshot();
    const activity = await this.activityRepository.findById(activityId);
    const overrideName = typeof overrides.routineName === 'string' ? overrides.routineName.trim() : '';
    const name = overrideName || activity?.name || 'Rutina sugerida';

    const routine = await this.createFixedRoutineUseCase.execute(userId, {
      name,
      icon: 'moon',
      type: 'range',
      linkedActivityId: activityId,
      weekdays: asWeekdaysOrNull(overrides.suggestedDays, snapshot.suggestedDays as number[] | null),
      startDate: asStringOrNull(overrides.suggestedStartDate, snapshot.suggestedStartDate as string | null),
      endDate: asStringOrNull(overrides.suggestedEndDate, snapshot.suggestedEndDate as string | null),
    });
    await this.applySuggestedTimeForDate(userId, routine.id, suggestion, overrides);
  }

  private async updateRoutineFromSuggestion(
    userId: string,
    suggestion: ActivitySuggestion,
    overrides: Record<string, unknown>,
  ): Promise<void> {
    const routineId = suggestion.routineId;
    if (!routineId) return; // no debería ocurrir para este tipo, pero por seguridad no toca nada a ciegas

    const snapshot = suggestion.suggestedValuesSnapshot();
    await this.updateFixedRoutineUseCase.execute(userId, routineId, {
      weekdays: asWeekdaysOrNull(overrides.suggestedDays, snapshot.suggestedDays as number[] | null),
    });
    await this.applySuggestedTimeForDate(userId, routineId, suggestion, overrides);
  }

  private async applySuggestedTimeForDate(
    userId: string,
    routineId: string,
    suggestion: ActivitySuggestion,
    overrides: Record<string, unknown>,
  ): Promise<void> {
    const snapshot = suggestion.suggestedValuesSnapshot();
    const logDate = asDateOrNull(overrides.logDate);
    const start = asTimeOrNull(overrides.suggestedStartTime, snapshot.suggestedStartTime as string | null);
    const end = asTimeOrNull(overrides.suggestedEndTime, snapshot.suggestedEndTime as string | null);
    if (!logDate || !start || !end) return;
    const suggestedDays = snapshot.suggestedDays as number[] | null;
    if (suggestedDays && !suggestedDays.includes(parseDateOnly(logDate).getUTCDay())) return;
    await this.putRoutineLogUseCase.execute(userId, routineId, logDate, [{ start, end }]);
  }
}
