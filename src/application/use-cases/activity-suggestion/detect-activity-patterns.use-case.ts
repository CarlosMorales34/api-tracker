import { ActivityPattern } from '../../../domain/entities/activity-pattern.entity';
import { ActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { SUGGESTION_THRESHOLDS } from '../../../shared/config/suggestion-thresholds';
import {
  ManualTimeSample,
  buildScheduleEstimate,
  detectWeekdayFrequency,
  formatMinutesAsHHMM,
  hasMinimumEvidence,
  parseHHMMToMinutes,
} from '../../../shared/utils/activity-pattern-calculations';
import { addDaysUTC, formatDateOnly, getWeekStart, parseDateOnly, todayDateOnly } from '../../../shared/utils/week';

interface ActivityGroup {
  activityName: string;
  categoryId: string;
  samples: ManualTimeSample[];
}

// El detector: encuentra patrones de horario/frecuencia en el historial
// MANUAL (nunca reflejado de una rutina -- ver
// ActivityLogRepository.findManualTimesByUserAndDateRange) de un usuario.
// No decide nada, no persiste nada, no sabe qué es una "sugerencia" --
// GenerateSuggestionsUseCase es quien decide qué hacer con estos patrones.
// Esta separación es la que evita el ciclo de autoaprendizaje: solo entra a
// este cálculo lo que el usuario registró de forma independiente.
export class DetectActivityPatternsUseCase {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async execute(userId: string): Promise<ActivityPattern[]> {
    const today = todayDateOnly();
    const todayDate = parseDateOnly(today);
    const lookbackWeeks = SUGGESTION_THRESHOLDS.PATTERN_LOOKBACK_WEEKS;
    const from = formatDateOnly(addDaysUTC(todayDate, -lookbackWeeks * 7));

    const entries = await this.activityLogRepository.findManualTimesByUserAndDateRange(userId, from, today);

    const byActivity = new Map<string, ActivityGroup>();
    for (const entry of entries) {
      const logDate = parseDateOnly(entry.logDate);
      const group = byActivity.get(entry.activityId) ?? {
        activityName: entry.activityName,
        categoryId: entry.categoryId,
        samples: [],
      };
      group.samples.push({
        weekday: logDate.getUTCDay(),
        weekKey: formatDateOnly(getWeekStart(logDate)),
        startMinutes: parseHHMMToMinutes(entry.startTime),
        endMinutes: parseHHMMToMinutes(entry.endTime),
        daysAgo: Math.round((todayDate.getTime() - logDate.getTime()) / 86400000),
      });
      byActivity.set(entry.activityId, group);
    }

    const patterns: ActivityPattern[] = [];
    for (const [activityId, group] of byActivity) {
      const frequencies = detectWeekdayFrequency(group.samples, lookbackWeeks);
      const strongWeekdays = frequencies.filter((freq) => hasMinimumEvidence(freq.sampleCount, freq.distinctWeeks));
      if (strongWeekdays.length === 0) continue;

      const weekdaySet = new Set(strongWeekdays.map((freq) => freq.weekday));
      const relevantSamples = group.samples.filter((sample) => weekdaySet.has(sample.weekday));
      const estimate = buildScheduleEstimate(relevantSamples);

      const matchRatio = strongWeekdays.reduce((sum, freq) => sum + freq.matchRatio, 0) / strongWeekdays.length;
      const lastSeenDaysAgo = Math.min(...relevantSamples.map((sample) => sample.daysAgo));

      patterns.push({
        activityId,
        activityName: group.activityName,
        categoryId: group.categoryId,
        weekdays: [...weekdaySet].sort((a, b) => a - b),
        sampleCount: relevantSamples.length,
        distinctWeeks: new Set(relevantSamples.map((sample) => sample.weekKey)).size,
        matchRatio,
        startTime: formatMinutesAsHHMM(estimate.medianStartMinutes),
        endTime: formatMinutesAsHHMM(estimate.medianEndMinutes),
        durationMinutes: estimate.medianDurationMinutes,
        crossesMidnight: estimate.crossesMidnight,
        lastSeenDaysAgo,
        startDispersionMinutes: estimate.startDispersionMinutes,
        durationDispersionMinutes: estimate.durationDispersionMinutes,
      });
    }

    return patterns;
  }
}
