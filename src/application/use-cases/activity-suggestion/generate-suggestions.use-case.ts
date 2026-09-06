import { randomUUID } from 'node:crypto';
import { ActivitySuggestion, SuggestionType } from '../../../domain/entities/activity-suggestion.entity';
import { DEFAULT_USER_SUGGESTION_SETTINGS } from '../../../domain/entities/user-suggestion-settings.entity';
import { ActivitySuggestionRepository } from '../../../domain/repositories/activity-suggestion.repository';
import { FixedRoutineRepository } from '../../../domain/repositories/fixed-routine.repository';
import { SuggestionFeedbackRepository } from '../../../domain/repositories/suggestion-feedback.repository';
import { UserSuggestionSettingsRepository } from '../../../domain/repositories/user-suggestion-settings.repository';
import { SUGGESTION_THRESHOLDS } from '../../../shared/config/suggestion-thresholds';
import {
  blendMinutesWithCorrections,
  computeConfidence,
  formatMinutesAsHHMM,
  meetsShowThreshold,
  parseHHMMToMinutes,
} from '../../../shared/utils/activity-pattern-calculations';
import { todayDateOnly } from '../../../shared/utils/week';
import { DetectActivityPatternsUseCase } from './detect-activity-patterns.use-case';
import { DetectRoutinePatternsUseCase } from './detect-routine-patterns.use-case';

const WEEKDAY_ABBR_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function describeWeekdays(weekdays: number[]): string {
  if (weekdays.length === 7) return 'todos los días';
  const sorted = [...weekdays].sort((a, b) => a - b);
  const isContiguousRun = sorted.length > 2 && sorted.every((day, index) => index === 0 || day === sorted[index - 1]! + 1);
  if (isContiguousRun) {
    return `${WEEKDAY_ABBR_ES[sorted[0]!]}-${WEEKDAY_ABBR_ES[sorted[sorted.length - 1]!]}`;
  }
  return sorted.map((day) => WEEKDAY_ABBR_ES[day]).join(', ');
}

function extractSuggestedMinutes(
  values: Record<string, unknown> | null,
  field: 'suggestedStartTime' | 'suggestedEndTime',
): number | null {
  const raw = values?.[field];
  return typeof raw === 'string' ? parseHHMMToMinutes(raw) : null;
}

// El generador: toma los patrones que ya calculó el detector y decide
// cuáles convertir en una ActivitySuggestion real (persistida, pendiente de
// decisión). Aplica el umbral de confianza mínima, evita duplicar una
// sugerencia ya pendiente para la misma actividad, y acerca gradualmente el
// horario sugerido a las correcciones recientes del usuario. Nunca crea,
// modifica ni borra actividades -- solo deja la propuesta lista para que el
// usuario decida.
//
// Por actividad se genera SOLO UNA de estas dos (nunca ambas, para no
// duplicar la misma información): 'create_routine' si la actividad todavía
// no está vinculada a ninguna rutina fija (candidata real a convertirse en
// una), o 'suggest_schedule' si ya lo está (ahí solo tiene sentido rellenar
// el horario al capturar el día, no proponer crear otra rutina).
//
// Rutinas fijas ya existentes (Dormir, Trabajo...) generan 'update_routine'
// cuando el patrón detectado en su historial (routine_log_times) no
// coincide con los `weekdays` que la rutina tiene guardados hoy -- ya sea
// porque nunca se configuraron (null = "todos los días", el default
// histórico) o porque cambiaron. Nunca se genera si ya coinciden: no tiene
// sentido "sugerir" lo que la rutina ya confirma.
//
// Alcance de esta entrega: suggest_category/suggest_activity_name/
// suggest_duration/suggest_next_occurrence quedan definidos en el modelo
// (para no requerir otra migración después) pero su generación queda para
// una siguiente iteración.
export class GenerateSuggestionsUseCase {
  constructor(
    private readonly detectActivityPatternsUseCase: DetectActivityPatternsUseCase,
    private readonly detectRoutinePatternsUseCase: DetectRoutinePatternsUseCase,
    private readonly activitySuggestionRepository: ActivitySuggestionRepository,
    private readonly suggestionFeedbackRepository: SuggestionFeedbackRepository,
    private readonly userSuggestionSettingsRepository: UserSuggestionSettingsRepository,
    private readonly fixedRoutineRepository: FixedRoutineRepository,
  ) {}

  async execute(userId: string): Promise<ActivitySuggestion[]> {
    const settings = (await this.userSuggestionSettingsRepository.find(userId)) ?? DEFAULT_USER_SUGGESTION_SETTINGS;
    if (!settings.suggestionsEnabled) return [];

    const [patterns, routinePatterns, existingRoutines] = await Promise.all([
      this.detectActivityPatternsUseCase.execute(userId),
      this.detectRoutinePatternsUseCase.execute(userId),
      this.fixedRoutineRepository.findAllByUserId(userId),
    ]);
    const created: ActivitySuggestion[] = [];
    const sinceDate = new Date(Date.now() - SUGGESTION_THRESHOLDS.RECENCY_DECAY_DAYS * 86400000);

    const activityIdsWithRoutine = new Set(
      existingRoutines.map((routine) => routine.linkedActivityId).filter((id): id is string => id !== null),
    );

    for (const pattern of patterns) {
      const suggestionType: SuggestionType = activityIdsWithRoutine.has(pattern.activityId)
        ? 'suggest_schedule'
        : 'create_routine';
      const target = {
        suggestionType,
        activityId: pattern.activityId,
        routineId: null,
      };

      const alreadyPending = await this.activitySuggestionRepository.findPendingDuplicate(userId, {
        ...target,
        categoryId: null,
      });
      if (alreadyPending) continue;

      const [recentDismissals, recentAcceptances] = await Promise.all([
        this.activitySuggestionRepository.countRecentByStatusForTarget(userId, target, ['dismissed'], sinceDate),
        this.activitySuggestionRepository.countRecentByStatusForTarget(
          userId,
          target,
          ['accepted', 'accepted_with_changes'],
          sinceDate,
        ),
      ]);

      const confidence = computeConfidence({
        sampleCount: pattern.sampleCount,
        distinctWeeks: pattern.distinctWeeks,
        scheduleDispersionMinutes: Math.max(pattern.startDispersionMinutes, pattern.durationDispersionMinutes),
        daysSinceLastSample: pattern.lastSeenDaysAgo,
        recentDismissalsForSimilar: recentDismissals,
        recentAcceptancesForSimilar: recentAcceptances,
      });
      if (!meetsShowThreshold(confidence)) continue;

      // Correcciones recientes del usuario para esta misma actividad -- el
      // horario sugerido se acerca gradualmente a ellas en vez de repetir
      // ciegamente la mediana histórica (ver blendMinutesWithCorrections).
      const corrections = await this.suggestionFeedbackRepository.findRecentCorrectionsForTarget(
        userId,
        { activityId: pattern.activityId, routineId: null },
        SUGGESTION_THRESHOLDS.RECENT_CORRECTIONS_WINDOW,
      );
      const startCorrections = corrections
        .map((feedback) => extractSuggestedMinutes(feedback.finalValues, 'suggestedStartTime'))
        .filter((value): value is number => value !== null);
      const endCorrections = corrections
        .map((feedback) => extractSuggestedMinutes(feedback.finalValues, 'suggestedEndTime'))
        .filter((value): value is number => value !== null);

      const blendedStartMinutes = blendMinutesWithCorrections(parseHHMMToMinutes(pattern.startTime), startCorrections);
      const blendedEndMinutes = blendMinutesWithCorrections(parseHHMMToMinutes(pattern.endTime), endCorrections);

      const percent = Math.round(pattern.matchRatio * 100);
      const prefix = suggestionType === 'create_routine' ? 'Podrías convertir esto en rutina: ' : '';
      const reason =
        `${prefix}${describeWeekdays(pattern.weekdays)} · ${formatMinutesAsHHMM(blendedStartMinutes)}-${formatMinutesAsHHMM(blendedEndMinutes)} · ` +
        `${pattern.sampleCount} registros en ${pattern.distinctWeeks} semanas · ${percent}% de coincidencia`;

      const suggestion = ActivitySuggestion.create({
        id: randomUUID(),
        userId,
        suggestionType,
        activityId: pattern.activityId,
        categoryId: pattern.categoryId,
        suggestedDays: pattern.weekdays,
        suggestedStartTime: formatMinutesAsHHMM(blendedStartMinutes),
        suggestedEndTime: formatMinutesAsHHMM(blendedEndMinutes),
        suggestedDurationMinutes: pattern.durationMinutes,
        // "Crear únicamente ocurrencias futuras": la rutina, si se acepta,
        // arranca hoy -- nunca afecta routine_logs pasados (esos ya existen
        // por su propia fecha, independientes de esta vigencia).
        suggestedStartDate: suggestionType === 'create_routine' ? todayDateOnly() : null,
        suggestedEndDate: null, // "dejarla activa hasta desactivarla"
        confidence,
        sampleCount: pattern.sampleCount,
        distinctWeeks: pattern.distinctWeeks,
        reason,
      });

      await this.activitySuggestionRepository.save(suggestion);
      created.push(suggestion);
    }

    const routineById = new Map(existingRoutines.map((routine) => [routine.id, routine]));

    for (const pattern of routinePatterns) {
      const routine = routineById.get(pattern.routineId);
      if (!routine) continue; // la rutina se borró entre el detect y el generate -- no sugerir sobre algo que ya no existe

      // Ya coincide con lo que la rutina tiene guardado -- nada nuevo que sugerir.
      const currentWeekdays = routine.weekdays ? [...routine.weekdays].sort((a, b) => a - b) : null;
      const patternWeekdaysSorted = [...pattern.weekdays].sort((a, b) => a - b);
      if (currentWeekdays !== null && JSON.stringify(currentWeekdays) === JSON.stringify(patternWeekdaysSorted)) {
        continue;
      }

      const target = { suggestionType: 'update_routine' as const, activityId: null, routineId: pattern.routineId };

      const alreadyPending = await this.activitySuggestionRepository.findPendingDuplicate(userId, {
        ...target,
        categoryId: null,
      });
      if (alreadyPending) continue;

      const [recentDismissals, recentAcceptances] = await Promise.all([
        this.activitySuggestionRepository.countRecentByStatusForTarget(userId, target, ['dismissed'], sinceDate),
        this.activitySuggestionRepository.countRecentByStatusForTarget(
          userId,
          target,
          ['accepted', 'accepted_with_changes'],
          sinceDate,
        ),
      ]);

      const confidence = computeConfidence({
        sampleCount: pattern.sampleCount,
        distinctWeeks: pattern.distinctWeeks,
        scheduleDispersionMinutes: Math.max(pattern.startDispersionMinutes, pattern.durationDispersionMinutes),
        daysSinceLastSample: pattern.lastSeenDaysAgo,
        recentDismissalsForSimilar: recentDismissals,
        recentAcceptancesForSimilar: recentAcceptances,
      });
      if (!meetsShowThreshold(confidence)) continue;

      const corrections = await this.suggestionFeedbackRepository.findRecentCorrectionsForTarget(
        userId,
        { activityId: null, routineId: pattern.routineId },
        SUGGESTION_THRESHOLDS.RECENT_CORRECTIONS_WINDOW,
      );
      const startCorrections = corrections
        .map((feedback) => extractSuggestedMinutes(feedback.finalValues, 'suggestedStartTime'))
        .filter((value): value is number => value !== null);
      const endCorrections = corrections
        .map((feedback) => extractSuggestedMinutes(feedback.finalValues, 'suggestedEndTime'))
        .filter((value): value is number => value !== null);

      const blendedStartMinutes = blendMinutesWithCorrections(parseHHMMToMinutes(pattern.startTime), startCorrections);
      const blendedEndMinutes = blendMinutesWithCorrections(parseHHMMToMinutes(pattern.endTime), endCorrections);

      const percent = Math.round(pattern.matchRatio * 100);
      const prefix = currentWeekdays === null ? 'Podemos confirmar el horario de tu rutina: ' : 'Tu rutina cambió de patrón: ';
      const reason =
        `${prefix}${describeWeekdays(pattern.weekdays)} · ${formatMinutesAsHHMM(blendedStartMinutes)}-${formatMinutesAsHHMM(blendedEndMinutes)} · ` +
        `${pattern.sampleCount} registros en ${pattern.distinctWeeks} semanas · ${percent}% de coincidencia`;

      const suggestion = ActivitySuggestion.create({
        id: randomUUID(),
        userId,
        suggestionType: 'update_routine',
        routineId: pattern.routineId,
        suggestedDays: pattern.weekdays,
        suggestedStartTime: formatMinutesAsHHMM(blendedStartMinutes),
        suggestedEndTime: formatMinutesAsHHMM(blendedEndMinutes),
        suggestedDurationMinutes: pattern.durationMinutes,
        confidence,
        sampleCount: pattern.sampleCount,
        distinctWeeks: pattern.distinctWeeks,
        reason,
      });

      await this.activitySuggestionRepository.save(suggestion);
      created.push(suggestion);
    }

    return created;
  }
}
