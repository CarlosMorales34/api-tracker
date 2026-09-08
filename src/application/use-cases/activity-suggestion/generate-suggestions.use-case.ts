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
import { parseDateOnly, todayDateOnly } from '../../../shared/utils/week';
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

function computeHabitConfidence(input: {
  sampleCount: number;
  distinctWeeks: number;
  daysSinceLastSample: number;
  recentDismissalsForSimilar: number;
  recentAcceptancesForSimilar: number;
}): number {
  const t = SUGGESTION_THRESHOLDS;
  const sampleFactor = Math.min(1, input.sampleCount / (t.MIN_SAMPLE_COUNT * t.SAMPLE_FACTOR_SATURATION_MULTIPLIER));
  const weekFactor = Math.min(1, input.distinctWeeks / (t.MIN_DISTINCT_WEEKS * t.WEEK_FACTOR_SATURATION_MULTIPLIER));
  const recencyFactor = Math.min(1, Math.max(0, 1 - input.daysSinceLastSample / t.RECENCY_DECAY_DAYS));
  const dismissalPenalty = Math.min(1, Math.max(0, 1 - input.recentDismissalsForSimilar * t.DISMISSAL_PENALTY_PER_EVENT));
  const acceptanceBoost = 1 + input.recentAcceptancesForSimilar * t.ACCEPTANCE_BOOST_PER_EVENT;
  return Math.round(Math.min(1, sampleFactor * weekFactor * recencyFactor * dismissalPenalty * acceptanceBoost) * 1000) / 1000;
}

function confidenceForSuggestion(input: {
  sampleCount: number;
  distinctWeeks: number;
  scheduleDispersionMinutes: number;
  daysSinceLastSample: number;
  recentDismissalsForSimilar: number;
  recentAcceptancesForSimilar: number;
}): number {
  const scheduleConfidence = computeConfidence(input);
  const habitConfidence = computeHabitConfidence(input);
  return Math.max(scheduleConfidence, habitConfidence);
}

function describeScheduleCertainty(dispersionMinutes: number): string {
  if (dispersionMinutes <= SUGGESTION_THRESHOLDS.MAX_DISPERSION_MINUTES_FOR_ZERO_CONFIDENCE) return '';
  return ' · horario estimado, varía bastante';
}

function activityPatternCanCreateRoutine(matchRatio: number): boolean {
  return matchRatio >= SUGGESTION_THRESHOLDS.MIN_ACTIVITY_MATCH_RATIO_TO_CREATE_ROUTINE;
}

function routinePatternCanUpdate(matchRatio: number): boolean {
  return matchRatio >= SUGGESTION_THRESHOLDS.MIN_ROUTINE_MATCH_RATIO_TO_UPDATE;
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
// mientras haya datos suficientes -- a diferencia de las sugerencias de
// actividad, estas se refrescan a diario (no una sola vez ni solo mientras
// `routine.weekdays` no coincida): el usuario quiere seguir viendo/
// confirmando el patrón detectado día a día, incluso después de aceptar una
// sugerencia anterior, para que el horario sugerido se siga acercando a sus
// correcciones recientes (ver blendMinutesWithCorrections). El único freno
// es no crear más de una por rutina el mismo día (`alreadyToday` abajo).
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
    const todayStart = parseDateOnly(todayDateOnly());

    const routineById = new Map(existingRoutines.map((routine) => [routine.id, routine]));

    for (const pattern of routinePatterns) {
      const routine = routineById.get(pattern.routineId);
      if (!routine) continue; // la rutina se borró entre el detect y el generate -- no sugerir sobre algo que ya no existe

      const currentWeekdays = routine.weekdays ? [...routine.weekdays].sort((a, b) => a - b) : null;

      const target = { suggestionType: 'update_routine' as const, activityId: null, routineId: pattern.routineId };

      const alreadyPending = await this.activitySuggestionRepository.findPendingDuplicate(userId, {
        ...target,
        categoryId: null,
      });
      if (!routinePatternCanUpdate(pattern.matchRatio)) {
        if (alreadyPending) await this.activitySuggestionRepository.updatePendingDuplicatesStatus(userId, { ...target, categoryId: null }, 'expired');
        continue;
      }
      if (alreadyPending) continue;

      // No más de una por rutina el mismo día, sin importar en qué haya
      // quedado (aceptada, descartada, expirada) -- evita re-sugerir en
      // cada carga de página el mismo día, pero sí permite una nueva mañana.
      const alreadyToday = await this.activitySuggestionRepository.countRecentByStatusForTarget(
        userId,
        target,
        ['pending', 'accepted', 'accepted_with_changes', 'dismissed', 'expired'],
        todayStart,
      );
      if (alreadyToday > 0) continue;

      const [recentDismissals, recentAcceptances] = await Promise.all([
        this.activitySuggestionRepository.countRecentByStatusForTarget(userId, target, ['dismissed'], sinceDate),
        this.activitySuggestionRepository.countRecentByStatusForTarget(
          userId,
          target,
          ['accepted', 'accepted_with_changes'],
          sinceDate,
        ),
      ]);

      const scheduleDispersionMinutes = Math.max(pattern.startDispersionMinutes, pattern.durationDispersionMinutes);
      const confidence = confidenceForSuggestion({
        sampleCount: pattern.sampleCount,
        distinctWeeks: pattern.distinctWeeks,
        scheduleDispersionMinutes,
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
        `${pattern.sampleCount} registros en ${pattern.distinctWeeks} semanas · ${percent}% de coincidencia${describeScheduleCertainty(scheduleDispersionMinutes)}`;

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
        categoryId: pattern.categoryId,
      });
      if (suggestionType === 'create_routine' && !activityPatternCanCreateRoutine(pattern.matchRatio)) {
        if (alreadyPending) {
          await this.activitySuggestionRepository.updatePendingDuplicatesStatus(
            userId,
            { ...target, categoryId: pattern.categoryId },
            'expired',
          );
        }
        continue;
      }
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

      const scheduleDispersionMinutes = Math.max(pattern.startDispersionMinutes, pattern.durationDispersionMinutes);
      const confidence = confidenceForSuggestion({
        sampleCount: pattern.sampleCount,
        distinctWeeks: pattern.distinctWeeks,
        scheduleDispersionMinutes,
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
        `${pattern.sampleCount} registros en ${pattern.distinctWeeks} semanas · ${percent}% de coincidencia${describeScheduleCertainty(scheduleDispersionMinutes)}`;

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
    return created;
  }
}
