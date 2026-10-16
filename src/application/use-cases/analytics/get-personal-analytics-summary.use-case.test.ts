import { describe, expect, it } from 'vitest';
import { PersonalAnalyticsRepository, AnalyticsRoutineTimeEntry, AnalyticsActivityTimeEntry } from '../../../domain/repositories/personal-analytics.repository';
import { GetPersonalAnalyticsSummaryUseCase } from './get-personal-analytics-summary.use-case';

const routine = (logDate: string, startTime: string, endTime: string, isSleep = true): AnalyticsRoutineTimeEntry => ({
  routineId: isSleep ? 'sleep' : 'work', routineName: isSleep ? 'Dormir' : 'Trabajo', isSleep, logDate, startTime, endTime,
});
const activity = (logDate: string, startTime: string, endTime: string, activityName = 'Programacion'): AnalyticsActivityTimeEntry => ({
  categoryId: 'category', categoryName: 'Crecimiento', categoryColor: '#ffffff', activityId: activityName,
  activityName, logDate, startTime, endTime, source: 'manual', sourceRoutineId: null, sourceRoutineName: null,
});
function repository(overrides: Partial<PersonalAnalyticsRepository> = {}): PersonalAnalyticsRepository {
  return {
    findRoutineTimes: async () => [], findActivityTimes: async () => [], findCategoryTotals: async () => [],
    findActivityTotals: async () => [], findWorkoutSessions: async () => [], findExerciseTotals: async () => [],
    findBodyMeasurements: async () => [], findActiveBodyGoal: async () => null, ...overrides,
  };
}

describe('personal analytics evidence', () => {
  it('separates secondary sleep, handles midnight and leaves unobserved dates unknown', async () => {
    const service = new GetPersonalAnalyticsSummaryUseCase(repository({
      findRoutineTimes: async (_user, from) => from === '2026-10-01' ? [
        routine('2026-10-01', '23:30', '07:30'), routine('2026-10-02', '00:30', '06:00'),
        routine('2026-10-02', '11:00', '13:00'),
      ] : [],
    }));
    const result = await service.execute('user', { from: '2026-10-01', to: '2026-10-03' });
    expect(result.sleep).toMatchObject({ days: 2, samples: 2, medianBedtime: '00:00', secondaryHours: 2, secondarySamples: 1, shortSleepDays: 1 });
    expect(result.timeline[1]?.sleepHours).toBe(5.5);
    expect(result.timeline[2]).toMatchObject({ sleepHours: null, workHours: null, activityHours: null, workoutMinutes: null });
    expect(result.comparison.sleepChangeHours).toBeNull();
  });

  it('counts a linked routine once, unions overlapping time and measures the actual daily span', async () => {
    const service = new GetPersonalAnalyticsSummaryUseCase(repository({
      findRoutineTimes: async (_user, from) => from === '2026-10-01' ? [routine('2026-10-01', '08:00', '13:00', false)] : [],
      findActivityTimes: async () => [activity('2026-10-01', '08:00', '13:00'), activity('2026-10-01', '16:00', '19:00'), activity('2026-10-01', '17:00', '18:00', 'Musica')],
    }));
    const result = await service.execute('user', { from: '2026-10-01', to: '2026-10-02' });
    expect(result.work).toMatchObject({ days: 1, samples: 2, totalHours: 8, medianStartTime: '08:00', medianEndTime: '19:00', multiBlockDays: 1 });
    expect(result.work.weekdayAverages[0]).toMatchObject({ averageHours: 8, samples: 1 });
    expect(result.timeline[0]).toMatchObject({ workHours: 8, activityHours: 8 });
    expect(result.dataQuality.warnings.some((warning) => warning.id === 'overlapping-activities')).toBe(true);
  });

  it('counts training dates rather than duplicate sessions, excludes missing duration, and does not infer a weight trend from two points', async () => {
    const session = (workoutId: string, durationMinutes: number) => ({ workoutId, workoutDate: '2026-10-01', durationMinutes, exerciseCount: 0, totalSets: 0, totalReps: 0, totalVolume: 0 });
    const service = new GetPersonalAnalyticsSummaryUseCase(repository({
      findWorkoutSessions: async () => [session('one', 60), session('two', 0)],
      findBodyMeasurements: async () => [
        { measuredAt: '2026-09-01', weightKg: 60, bodyFatPercentage: null, waistCm: null },
        { measuredAt: '2026-10-01', weightKg: 61, bodyFatPercentage: null, waistCm: null },
      ],
      findActiveBodyGoal: async () => ({ goalType: 'gain', startWeightKg: 60, targetWeightKg: 70, startDate: '2026-01-01', targetDate: null }),
    }));
    const result = await service.execute('user', { from: '2026-10-01', to: '2026-10-07' });
    expect(result.training).toMatchObject({ sessions: 2, activeDays: 1, sessionsPerWeek: 1, averageMinutes: 60 });
    expect(result.body).toMatchObject({ deltaVsPreviousKg: 1, trendVsGoal: null, measurementAgeDays: 6 });
    expect(result.training.weeklyDays.every((week) => !week.complete)).toBe(true);
  });
});
