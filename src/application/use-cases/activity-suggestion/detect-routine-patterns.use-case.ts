import { RoutinePattern } from '../../../domain/entities/routine-pattern.entity';
import { RoutineLogRepository } from '../../../domain/repositories/routine-log.repository';
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

interface RoutineGroup {
  routineName: string;
  isSleep: boolean;
  samples: ManualTimeSample[];
}

// Igual que DetectActivityPatternsUseCase pero sobre el historial de rutinas
// fijas (routine_log_times) -- es precisamente lo que motivó esta feature
// ("tengo patrones muy establecidos como mi sueño y mi trabajo"). No hay
// riesgo de ciclo de autoaprendizaje acá: routine_log_times siempre es
// captura directa del usuario para ESA rutina, nunca un reflejo generado a
// partir de otra cosa (a diferencia de activity_log_times.source='routine').
export class DetectRoutinePatternsUseCase {
  constructor(private readonly routineLogRepository: RoutineLogRepository) {}

  async execute(userId: string): Promise<RoutinePattern[]> {
    const today = todayDateOnly();
    const todayDate = parseDateOnly(today);
    const lookbackWeeks = SUGGESTION_THRESHOLDS.PATTERN_LOOKBACK_WEEKS;
    const from = formatDateOnly(addDaysUTC(todayDate, -lookbackWeeks * 7));

    const entries = await this.routineLogRepository.findTimesByUserAndDateRange(userId, from, today);

    const byRoutine = new Map<string, RoutineGroup>();
    for (const entry of entries) {
      const logDate = parseDateOnly(entry.logDate);
      const group = byRoutine.get(entry.routineId) ?? {
        routineName: entry.routineName,
        isSleep: entry.isSleep,
        samples: [],
      };
      group.samples.push({
        weekday: logDate.getUTCDay(),
        weekKey: formatDateOnly(getWeekStart(logDate)),
        startMinutes: parseHHMMToMinutes(entry.startTime),
        endMinutes: parseHHMMToMinutes(entry.endTime),
        daysAgo: Math.round((todayDate.getTime() - logDate.getTime()) / 86400000),
      });
      byRoutine.set(entry.routineId, group);
    }

    const patterns: RoutinePattern[] = [];
    for (const [routineId, group] of byRoutine) {
      const frequencies = detectWeekdayFrequency(group.samples, lookbackWeeks);
      const strongWeekdays = frequencies.filter((freq) => hasMinimumEvidence(freq.sampleCount, freq.distinctWeeks));
      if (strongWeekdays.length === 0) continue;

      const weekdaySet = new Set(strongWeekdays.map((freq) => freq.weekday));
      const relevantSamples = group.samples.filter((sample) => weekdaySet.has(sample.weekday));
      const estimate = buildScheduleEstimate(relevantSamples);

      const matchRatio = strongWeekdays.reduce((sum, freq) => sum + freq.matchRatio, 0) / strongWeekdays.length;
      const lastSeenDaysAgo = Math.min(...relevantSamples.map((sample) => sample.daysAgo));

      patterns.push({
        routineId,
        routineName: group.routineName,
        isSleep: group.isSleep,
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
