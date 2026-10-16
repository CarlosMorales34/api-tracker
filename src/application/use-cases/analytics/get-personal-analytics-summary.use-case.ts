import { PersonalAnalyticsRepository } from '../../../domain/repositories/personal-analytics.repository';
import {
  average,
  averageClockDeviation,
  durationHours,
  formatMinutesAsTime,
  median,
  parseTimeToMinutes,
  percent,
  round2,
  intervalUnionHours,
  principalSleepEntries,
} from '../../../shared/utils/analytics-calculations';
import { circularMeanMinutes, unwrapAroundReference } from '../../../shared/utils/activity-pattern-calculations';
import { addDaysUTC, formatDateOnly, parseDateOnly, todayDateOnly } from '../../../shared/utils/week';

type Severity = 'info' | 'warning' | 'positive';

export interface AnalyticsInsight {
  id: string;
  area: 'sleep' | 'work' | 'activities' | 'training' | 'body' | 'data-quality';
  severity: Severity;
  title: string;
  detail: string;
  metric?: string;
}

export interface PersonalAnalyticsSummary {
  range: { from: string; to: string; days: number };
  sleep: {
    hasData: boolean;
    days: number;
    samples: number;
    medianBedtime: string | null;
    medianWakeTime: string | null;
    averageHours: number | null;
    medianHours: number | null;
    bedtimeDispersionMinutes: number | null;
    shortSleepDays: number;
    secondaryHours: number;
    secondarySamples: number;
    weekdayAverages: { weekday: number; averageHours: number; samples: number }[];
  };
  work: {
    hasData: boolean;
    days: number;
    samples: number;
    totalHours: number;
    medianStartTime: string | null;
    medianEndTime: string | null;
    averageBlockHours: number | null;
    mostFrequentStartBucket: string | null;
    averageDayHours: number | null;
    multiBlockDays: number;
    weekendDays: number;
    blocks: { period: 'morning' | 'afternoon' | 'night'; samples: number; startTime: string; endTime: string }[];
    weekdayAverages: { weekday: number; averageHours: number; samples: number }[];
  };
  activities: {
    hasData: boolean;
    totalHours: number;
    categories: {
      categoryId: string;
      name: string;
      color: string;
      totalHours: number;
      activeDays: number;
      sharePercent: number;
      avgHoursPerActiveDay: number;
      hasEnoughData: boolean;
      dataMessage: string | null;
      activities: {
        activityId: string;
        name: string;
        totalHours: number;
        activeDays: number;
        sharePercent: number;
        avgHoursPerActiveDay: number;
        hasEnoughData: boolean;
        dataMessage: string | null;
      }[];
    }[];
    topActivities: {
      activityId: string;
      categoryName: string;
      name: string;
      totalHours: number;
      activeDays: number;
      avgHoursPerActiveDay: number;
    }[];
  };
  training: {
    hasData: boolean;
    sessions: number;
    totalHours: number;
    averageMinutes: number | null;
    sessionsPerWeek: number;
    activeDays: number;
    weeklyDays: { week: string; days: number; complete: boolean }[];
    lastWorkoutDate: string | null;
    weekdayCounts: { weekday: number; sessions: number; averageMinutes: number }[];
    topExercises: {
      name: string;
      appearances: number;
      lastDate: string;
      avgWeight: number | null;
      maxWeight: number | null;
      totalReps: number;
      totalVolume: number;
    }[];
  };
  body: {
    hasData: boolean;
    currentWeightKg: number | null;
    previousWeightKg: number | null;
    deltaVsPreviousKg: number | null;
    goalType: string | null;
    targetWeightKg: number | null;
    distanceToTargetKg: number | null;
    trendVsGoal: 'favorable' | 'unfavorable' | 'neutral' | null;
    latestMeasurementAt: string | null;
    measurementCount: number;
    measurementAgeDays: number | null;
  };
  timeline: {
    date: string;
    sleepHours: number | null;
    workHours: number | null;
    activityHours: number | null;
    workoutMinutes: number | null;
    weightKg: number | null;
  }[];
  dataQuality: {
    warnings: AnalyticsInsight[];
  };
  comparison: {
    from: string;
    to: string;
    sleepDays: number;
    sleepAverageHours: number | null;
    sleepChangeHours: number | null;
    bedtimeDispersionChangeMinutes: number | null;
  };
  insights: AnalyticsInsight[];
}

export class GetPersonalAnalyticsSummaryUseCase {
  constructor(private readonly analyticsRepository: PersonalAnalyticsRepository) {}

  async execute(userId: string, input: { from?: string; to?: string } = {}): Promise<PersonalAnalyticsSummary> {
    const today = todayDateOnly();
    const to = input.to ?? today;
    const from = input.from ?? formatDateOnly(addDaysUTC(parseDateOnly(to), -89));
    const days = Math.max(1, Math.round((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86400000) + 1);
    const previousTo = formatDateOnly(addDaysUTC(parseDateOnly(from), -1));
    const previousFrom = formatDateOnly(addDaysUTC(parseDateOnly(from), -days));

    const [
      routineTimes,
      activityTimes,
      categoryTotals,
      activityTotals,
      workoutSessions,
      exerciseTotals,
      bodyMeasurements,
      bodyGoal,
      previousRoutineTimes,
    ] =
      await Promise.all([
        this.analyticsRepository.findRoutineTimes(userId, from, to),
        this.analyticsRepository.findActivityTimes(userId, from, to),
        this.analyticsRepository.findCategoryTotals(userId, from, to),
        this.analyticsRepository.findActivityTotals(userId, from, to),
        this.analyticsRepository.findWorkoutSessions(userId, from, to),
        this.analyticsRepository.findExerciseTotals(userId, from, to),
        this.analyticsRepository.findBodyMeasurements(userId, from, to),
        this.analyticsRepository.findActiveBodyGoal(userId),
        this.analyticsRepository.findRoutineTimes(userId, previousFrom, previousTo),
      ]);

    const dataQualityWarnings = buildDataQualityWarnings(activityTimes, categoryTotals, workoutSessions);
    const suggestedDates = new Set(routineTimes.filter((entry) => entry.hasAcceptedSuggestion).map((entry) => entry.logDate)).size;
    if (suggestedDates) dataQualityWarnings.push({ id: 'suggestion-confirmations', area: 'data-quality', severity: 'info',
      title: `${suggestedDates} fechas con sugerencias aceptadas`,
      detail: 'Los horarios registrados pueden incluir propuestas confirmadas. Aceptar una propuesta no verifica su realizacion ni aporta evidencia independiente de su precision.' });
    const sleep = buildSleepSummary(routineTimes);
    const previousSleep = buildSleepSummary(previousRoutineTimes);
    const work = buildWorkSummary(routineTimes, activityTimes);
    const activities = buildActivitiesSummary(categoryTotals, activityTotals);
    const training = buildTrainingSummary(workoutSessions, exerciseTotals, days, from, to);
    const body = buildBodySummary(bodyMeasurements, bodyGoal, from, to);
    const timeline = buildTimeline(from, to, routineTimes, activityTimes, workoutSessions, bodyMeasurements);
    const insights = [
      ...dataQualityWarnings,
      ...buildSleepInsights(sleep),
      ...buildWorkInsights(work),
      ...buildActivityInsights(activities),
      ...buildTrainingInsights(training),
      ...buildBodyInsights(body),
    ];

    return {
      range: { from, to, days },
      sleep,
      work,
      activities,
      training,
      body,
      timeline,
      dataQuality: { warnings: dataQualityWarnings },
      comparison: {
        from: previousFrom,
        to: previousTo,
        sleepDays: previousSleep.days,
        sleepAverageHours: previousSleep.averageHours,
        sleepChangeHours: sleep.days >= 7 && previousSleep.days >= 7 && sleep.averageHours !== null && previousSleep.averageHours !== null
          ? round2(sleep.averageHours - previousSleep.averageHours) : null,
        bedtimeDispersionChangeMinutes: sleep.days >= 7 && previousSleep.days >= 7 && sleep.bedtimeDispersionMinutes !== null && previousSleep.bedtimeDispersionMinutes !== null
          ? sleep.bedtimeDispersionMinutes - previousSleep.bedtimeDispersionMinutes : null,
      },
      insights,
    };
  }
}

function normalizeForMatch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function looksLikeWork(name: string): boolean {
  return /\b(trabajo|trabaj|work|laboral|programacion|programar|programming|coding|code)\b/i.test(
    name.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  );
}

function looksLikeProgramming(name: string): boolean {
  return /\b(programar|programacion|programming|coding|code)\b/i.test(normalizeForMatch(name));
}

function weekdayOf(dateOnly: string): number {
  return parseDateOnly(dateOnly).getUTCDay();
}

function buildSleepSummary(routineTimes: Awaited<ReturnType<PersonalAnalyticsRepository['findRoutineTimes']>>) {
  const allSamples = routineTimes.filter((entry) => entry.isSleep && durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true }) > 0);
  // Existing logs have no sleep-kind flag. Use the longest block per recorded date.
  const samples = principalSleepEntries(allSamples);
  const principalSet = new Set(samples);
  const durations = samples.map((entry) => durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true }));
  const starts = samples.map((entry) => parseTimeToMinutes(entry.startTime));
  const ends = samples.map((entry) => parseTimeToMinutes(entry.endTime));
  const medianStart = starts.length ? median(starts.map((start) => unwrapAroundReference(start, circularMeanMinutes(starts)))) : null;
  const medianEnd = ends.length ? median(ends.map((end) => unwrapAroundReference(end, circularMeanMinutes(ends)))) : null;

  return {
    hasData: samples.length > 0,
    days: new Set(samples.map((entry) => entry.logDate)).size,
    samples: samples.length,
    medianBedtime: medianStart === null ? null : formatMinutesAsTime(medianStart),
    medianWakeTime: medianEnd === null ? null : formatMinutesAsTime(medianEnd),
    averageHours: average(durations) === null ? null : round2(average(durations)!),
    medianHours: median(durations) === null ? null : round2(median(durations)!),
    bedtimeDispersionMinutes:
      medianStart === null || averageClockDeviation(starts, medianStart) === null
        ? null
        : Math.round(averageClockDeviation(starts, medianStart)!),
    shortSleepDays: durations.filter((hours) => hours > 0 && hours < 7).length,
    secondaryHours: round2(allSamples.filter((sample) => !principalSet.has(sample)).reduce((sum, sample) =>
      sum + durationHours(sample.startTime, sample.endTime, { allowCrossMidnight: true }), 0)),
    secondarySamples: allSamples.length - samples.length,
    weekdayAverages: weekdayAverages(samples.map((entry) => ({ weekday: weekdayOf(entry.logDate), value: durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true }) }))),
  };
}

function buildTimeline(
  from: string,
  to: string,
  routineTimes: Awaited<ReturnType<PersonalAnalyticsRepository['findRoutineTimes']>>,
  activityTimes: Awaited<ReturnType<PersonalAnalyticsRepository['findActivityTimes']>>,
  workouts: Awaited<ReturnType<PersonalAnalyticsRepository['findWorkoutSessions']>>,
  measurements: Awaited<ReturnType<PersonalAnalyticsRepository['findBodyMeasurements']>>,
): PersonalAnalyticsSummary['timeline'] {
  const byDate = new Map<string, PersonalAnalyticsSummary['timeline'][number]>();
  for (let cursor = parseDateOnly(from); formatDateOnly(cursor) <= to; cursor = addDaysUTC(cursor, 1)) {
    const date = formatDateOnly(cursor);
    byDate.set(date, { date, sleepHours: null, workHours: null, activityHours: null, workoutMinutes: null, weightKg: null });
  }

  for (const entry of principalSleepEntries(routineTimes.filter((sample) => sample.isSleep))) {
    const row = byDate.get(entry.logDate);
    if (!row) continue;
    row.sleepHours = durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true });
  }

  const activitiesByDate = groupByDate(activityTimes);
  for (const [date, entries] of activitiesByDate) {
    const row = byDate.get(date);
    if (row) row.activityHours = intervalUnionHours(entries);
  }
  for (const [date, entries] of groupByDate(collectWorkSamples(routineTimes, activityTimes))) {
    const row = byDate.get(date);
    if (row) row.workHours = intervalUnionHours(entries);
  }

  for (const workout of workouts) {
    const row = byDate.get(workout.workoutDate);
    if (!row) continue;
    if (workout.durationMinutes > 0) row.workoutMinutes = round2((row.workoutMinutes ?? 0) + workout.durationMinutes);
  }

  for (const measurement of measurements) {
    const date = measurement.measuredAt.slice(0, 10);
    const row = byDate.get(date);
    if (!row || measurement.weightKg === null) continue;
    row.weightKg = measurement.weightKg;
  }

  return [...byDate.values()];
}

function buildWorkSummary(
  routineTimes: Awaited<ReturnType<PersonalAnalyticsRepository['findRoutineTimes']>>,
  activityTimes: Awaited<ReturnType<PersonalAnalyticsRepository['findActivityTimes']>>,
) {
  const samples = collectWorkSamples(routineTimes, activityTimes);
  const dailySamples = [...groupByDate(samples).values()];
  const dailyHours = dailySamples.map(intervalUnionHours);
  const firstStarts = dailySamples.map((entries) => Math.min(...entries.map((entry) => parseTimeToMinutes(entry.startTime))));
  const lastEnds = dailySamples.map((entries) => Math.max(...entries.map((entry) => {
    const start = parseTimeToMinutes(entry.startTime);
    const end = parseTimeToMinutes(entry.endTime);
    return end < start ? end + 1440 : end;
  })));
  const periods = ['morning', 'afternoon', 'night'] as const;
  const blocks = periods.flatMap((period) => {
    const entries = samples.filter((entry) => {
      const start = parseTimeToMinutes(entry.startTime);
      return period === 'morning' ? start < 720 : period === 'afternoon' ? start >= 720 && start < 1200 : start >= 1200;
    });
    if (!entries.length) return [];
    return [{ period, samples: entries.length, startTime: formatMinutesAsTime(median(entries.map((e) => parseTimeToMinutes(e.startTime)))!),
      endTime: formatMinutesAsTime(median(entries.map((e) => parseTimeToMinutes(e.endTime)))!) }];
  });
  const durations = samples.map((entry) => durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true }));
  const buckets = new Map<string, number>();
  for (const start of firstStarts) {
    const bucket = formatMinutesAsTime(Math.floor(start / 30) * 30);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  return {
    hasData: samples.length > 0,
    days: dailySamples.length,
    samples: samples.length,
    totalHours: round2(dailyHours.reduce((sum, value) => sum + value, 0)),
    medianStartTime: firstStarts.length ? formatMinutesAsTime(median(firstStarts)!) : null,
    medianEndTime: lastEnds.length ? formatMinutesAsTime(median(lastEnds)!) : null,
    averageBlockHours: durations.length ? round2(average(durations)!) : null,
    averageDayHours: dailyHours.length ? round2(average(dailyHours)!) : null,
    multiBlockDays: dailySamples.filter((entries) => entries.length > 1).length,
    weekendDays: [...groupByDate(samples).keys()].filter((date) => [0, 6].includes(weekdayOf(date))).length,
    blocks,
    mostFrequentStartBucket: [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    weekdayAverages: weekdayAverages(dailySamples.map((entries) => ({ weekday: weekdayOf(entries[0]!.logDate), value: intervalUnionHours(entries) }))),
  };
}

function groupByDate<T extends { logDate: string }>(entries: T[]): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const entry of entries) {
    const list = result.get(entry.logDate) ?? [];
    list.push(entry);
    result.set(entry.logDate, list);
  }
  return result;
}

function collectWorkSamples(
  routineTimes: Awaited<ReturnType<PersonalAnalyticsRepository['findRoutineTimes']>>,
  activityTimes: Awaited<ReturnType<PersonalAnalyticsRepository['findActivityTimes']>>,
) {
  const routineSamples = routineTimes
    .filter((entry) => !entry.isSleep && looksLikeWork(entry.routineName))
    .map((entry) => ({
      logDate: entry.logDate,
      startTime: entry.startTime,
      endTime: entry.endTime,
    }));
  const programmingSamples = activityTimes
    .filter((entry) => looksLikeProgramming(entry.activityName))
    .map((entry) => ({
      logDate: entry.logDate,
      startTime: entry.startTime,
      endTime: entry.endTime,
    }));
  const samplesByTime = new Map<string, { logDate: string; startTime: string; endTime: string }>();
  for (const sample of [...routineSamples, ...programmingSamples]) {
    samplesByTime.set(timeSampleKey(sample.logDate, sample.startTime, sample.endTime), sample);
  }
  return [...samplesByTime.values()].filter((entry) => durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true }) > 0);
}

function timeSampleKey(logDate: string, startTime: string, endTime: string): string {
  return `${logDate}|${startTime}|${endTime}`;
}

function weekdayAverages(samples: { weekday: number; value: number }[]): { weekday: number; averageHours: number; samples: number }[] {
  const byWeekday = new Map<number, number[]>();
  for (const sample of samples) {
    const list = byWeekday.get(sample.weekday) ?? [];
    list.push(sample.value);
    byWeekday.set(sample.weekday, list);
  }
  return [...byWeekday.entries()]
    .map(([weekday, values]) => ({ weekday, averageHours: round2(average(values) ?? 0), samples: values.length }))
    .sort((a, b) => a.weekday - b.weekday);
}

function buildActivitiesSummary(
  categoryTotals: Awaited<ReturnType<PersonalAnalyticsRepository['findCategoryTotals']>>,
  activityTotals: Awaited<ReturnType<PersonalAnalyticsRepository['findActivityTotals']>>,
) {
  const totalHours = round2(categoryTotals.reduce((sum, category) => sum + category.totalHours, 0));
  const activitiesByCategory = new Map<string, typeof activityTotals>();
  for (const activity of activityTotals) {
    const list = activitiesByCategory.get(activity.categoryId) ?? [];
    list.push(activity);
    activitiesByCategory.set(activity.categoryId, list);
  }
  return {
    hasData: totalHours > 0,
    totalHours,
    categories: categoryTotals.map((category) => {
      const categoryActivities = (activitiesByCategory.get(category.categoryId) ?? [])
        .map((activity) => {
          const hasEnoughData = hasEnoughActivityData(activity.totalHours, activity.activeDays);
          return {
            activityId: activity.activityId,
            name: activity.activityName,
            totalHours: activity.totalHours,
            activeDays: activity.activeDays,
            sharePercent: percent(activity.totalHours, category.totalHours),
            avgHoursPerActiveDay: activity.activeDays > 0 ? round2(activity.totalHours / activity.activeDays) : 0,
            hasEnoughData,
            dataMessage: hasEnoughData ? null : insufficientActivityMessage(activity.totalHours, activity.activeDays),
          };
        })
        .sort((a, b) => b.totalHours - a.totalHours || b.activeDays - a.activeDays || a.name.localeCompare(b.name));
      const hasEnoughData = hasEnoughActivityData(category.totalHours, category.activeDays);
      return {
        categoryId: category.categoryId,
        name: category.categoryName,
        color: category.categoryColor,
        totalHours: category.totalHours,
        activeDays: category.activeDays,
        sharePercent: percent(category.totalHours, totalHours),
        avgHoursPerActiveDay: category.activeDays > 0 ? round2(category.totalHours / category.activeDays) : 0,
        hasEnoughData,
        dataMessage: hasEnoughData ? null : insufficientActivityMessage(category.totalHours, category.activeDays),
        activities: categoryActivities,
      };
    }),
    topActivities: activityTotals
      .filter((activity) => activity.totalHours > 0)
      .map((activity) => ({
        activityId: activity.activityId,
        categoryName: activity.categoryName,
        name: activity.activityName,
        totalHours: activity.totalHours,
        activeDays: activity.activeDays,
        avgHoursPerActiveDay: activity.activeDays > 0 ? round2(activity.totalHours / activity.activeDays) : 0,
      })),
  };
}

function hasEnoughActivityData(totalHours: number, activeDays: number): boolean {
  return totalHours > 0 && activeDays >= 7;
}

function insufficientActivityMessage(totalHours: number, activeDays: number): string {
  if (totalHours <= 0 || activeDays <= 0) return 'Todavia no hay registros en este rango.';
  return 'Aun hay pocos datos para sacar una tendencia confiable.';
}

function buildTrainingSummary(
  workoutSessions: Awaited<ReturnType<PersonalAnalyticsRepository['findWorkoutSessions']>>,
  exerciseTotals: Awaited<ReturnType<PersonalAnalyticsRepository['findExerciseTotals']>>,
  days: number,
  from: string,
  to: string,
) {
  const durations = workoutSessions.filter((session) => session.durationMinutes > 0).map((session) => session.durationMinutes);
  const activeDates = new Set(workoutSessions.map((session) => session.workoutDate));
  const weeklyDays = new Map<string, number>();
  for (let cursor = parseDateOnly(from); formatDateOnly(cursor) <= to; cursor = addDaysUTC(cursor, 1)) {
    const week = formatDateOnly(addDaysUTC(cursor, -((cursor.getUTCDay() + 6) % 7)));
    weeklyDays.set(week, (weeklyDays.get(week) ?? 0) + (activeDates.has(formatDateOnly(cursor)) ? 1 : 0));
  }
  const byWeekday = new Map<number, typeof workoutSessions>();
  for (const session of workoutSessions) {
    const weekday = weekdayOf(session.workoutDate);
    const list = byWeekday.get(weekday) ?? [];
    list.push(session);
    byWeekday.set(weekday, list);
  }
  return {
    hasData: workoutSessions.length > 0,
    sessions: workoutSessions.length,
    totalHours: round2(workoutSessions.reduce((sum, session) => sum + session.durationMinutes / 60, 0)),
    averageMinutes: average(durations) === null ? null : Math.round(average(durations)!),
    sessionsPerWeek: round2(activeDates.size / Math.max(days / 7, 1)),
    activeDays: activeDates.size,
    weeklyDays: [...weeklyDays.entries()].map(([week, activeDays]) => ({ week, days: activeDays,
      complete: week >= from && formatDateOnly(addDaysUTC(parseDateOnly(week), 6)) <= to })),
    lastWorkoutDate: workoutSessions.at(-1)?.workoutDate ?? null,
    weekdayCounts: [...byWeekday.entries()]
      .map(([weekday, sessions]) => ({
        weekday,
        sessions: new Set(sessions.map((session) => session.workoutDate)).size,
        averageMinutes: Math.round(average(sessions.filter((session) => session.durationMinutes > 0).map((session) => session.durationMinutes)) ?? 0),
      }))
      .sort((a, b) => b.sessions - a.sessions),
    topExercises: exerciseTotals.map((exercise) => ({
      name: exercise.exerciseName,
      appearances: exercise.appearances,
      lastDate: exercise.lastDate,
      avgWeight: exercise.avgWeight,
      maxWeight: exercise.maxWeight,
      totalReps: exercise.totalReps,
      totalVolume: exercise.totalVolume,
    })),
  };
}

function buildBodySummary(
  measurements: Awaited<ReturnType<PersonalAnalyticsRepository['findBodyMeasurements']>>,
  goal: Awaited<ReturnType<PersonalAnalyticsRepository['findActiveBodyGoal']>>,
  from: string,
  to: string,
) {
  const weightPoints = measurements.filter((measurement) => measurement.weightKg !== null);
  const latest = weightPoints.at(-1) ?? null;
  const previous = weightPoints.at(-2) ?? null;
  const delta = latest && previous ? round2(latest.weightKg! - previous.weightKg!) : null;
  const distance = latest && goal?.targetWeightKg !== null && goal?.targetWeightKg !== undefined ? round2(goal.targetWeightKg - latest.weightKg!) : null;

  return {
    hasData: latest !== null,
    currentWeightKg: latest?.weightKg ?? null,
    previousWeightKg: previous?.weightKg ?? null,
    deltaVsPreviousKg: delta,
    goalType: goal?.goalType ?? null,
    targetWeightKg: goal?.targetWeightKg ?? null,
    distanceToTargetKg: distance,
    // Two isolated weigh-ins are a change, not evidence of a sustained trend.
    trendVsGoal: null,
    latestMeasurementAt: latest?.measuredAt ?? null,
    measurementCount: weightPoints.filter((point) => point.measuredAt.slice(0, 10) >= from).length,
    measurementAgeDays: latest ? Math.max(0, Math.round((parseDateOnly(to).getTime() - parseDateOnly(latest.measuredAt.slice(0, 10)).getTime()) / 86400000)) : null,
  };
}

function buildSleepInsights(summary: PersonalAnalyticsSummary['sleep']): AnalyticsInsight[] {
  if (!summary.hasData) return [];
  const insights: AnalyticsInsight[] = [];
  if (summary.medianHours !== null) {
    insights.push({
      id: 'sleep-duration',
      area: 'sleep',
      severity: 'info',
      title: `Bloque principal: ${summary.averageHours}h de promedio`,
      detail:
        summary.medianBedtime && summary.medianWakeTime
          ? `${summary.days} fechas registradas. Medianas de inicio ${summary.medianBedtime} y fin ${summary.medianWakeTime}; ${summary.secondarySamples} bloques secundarios separados. Se considera principal el bloque mas largo de cada fecha.`
          : 'Ya hay suficientes registros para seguir tendencia de descanso.',
      metric: `${summary.medianHours}h`,
    });
  }
  const weakestDay = [...summary.weekdayAverages].sort((a, b) => a.averageHours - b.averageHours)[0];
  if (weakestDay && weakestDay.samples >= 4 && weakestDay.averageHours < 7) {
    insights.push({
      id: 'sleep-weak-weekday',
      area: 'sleep',
      severity: 'warning',
      title: 'Menor duracion registrada por dia de la semana',
      detail: `El dia ${weekdayLabel(weakestDay.weekday)} promedia ${weakestDay.averageHours}h en ${weakestDay.samples} registros.`,
    });
  }
  return insights;
}

function buildWorkInsights(summary: PersonalAnalyticsSummary['work']): AnalyticsInsight[] {
  if (!summary.hasData) return [];
  return [
    {
      id: 'work-main-block',
      area: 'work',
      severity: 'info',
      title: `${summary.multiBlockDays} de ${summary.days} dias tienen varios bloques`,
      detail:
        summary.medianStartTime && summary.medianEndTime
          ? `Mediana del primer inicio: ${summary.medianStartTime}; del ultimo fin: ${summary.medianEndTime}, con pausas. Promedio ${summary.averageDayHours}h por dia registrado; ${summary.weekendDays} dias de fin de semana con trabajo.`
          : 'Ya hay datos para medir tus bloques de trabajo.',
      metric: summary.averageBlockHours === null ? undefined : `${summary.averageBlockHours}h/bloque`,
    },
  ];
}

function buildActivityInsights(summary: PersonalAnalyticsSummary['activities']): AnalyticsInsight[] {
  if (!summary.hasData) return [];
  const top = summary.categories.find((category) => category.totalHours > 0);
  if (!top) return [];
  return [
    {
      id: 'activity-top-category',
      area: 'activities',
      severity: 'info',
      title: `${top.name}: ${top.sharePercent}% de las horas etiquetadas`,
      detail: `Suma ${top.totalHours}h registradas. El reparto incluye programacion en su categoria y no equivale a todo tu tiempo disponible.`,
      metric: `${top.totalHours}h`,
    },
  ];
}

function buildTrainingInsights(summary: PersonalAnalyticsSummary['training']): AnalyticsInsight[] {
  if (!summary.hasData) return [];
  return [
    {
      id: 'training-consistency',
      area: 'training',
      severity: 'info',
      title: `${summary.sessionsPerWeek} dias de entrenamiento registrados por semana`,
      detail:
        summary.lastWorkoutDate === null
          ? 'Todavia no hay una ultima sesion identificable.'
          : `${summary.sessions} sesiones en ${summary.activeDays} fechas. Ultimo registro: ${summary.lastWorkoutDate}. Las semanas parciales se muestran por separado.`,
      metric: `${summary.sessions} sesiones`,
    },
  ];
}

function buildBodyInsights(summary: PersonalAnalyticsSummary['body']): AnalyticsInsight[] {
  if (!summary.hasData) return [];
  const insights: AnalyticsInsight[] = [];
  if (summary.distanceToTargetKg !== null && summary.targetWeightKg !== null) {
    insights.push({
      id: 'body-goal-distance',
      area: 'body',
      severity: summary.trendVsGoal === 'unfavorable' ? 'warning' : 'info',
      title: `Peso registrado: ${summary.currentWeightKg} kg; meta ${summary.targetWeightKg} kg`,
      detail:
        summary.deltaVsPreviousKg === null
          ? `Ultima medicion hace ${summary.measurementAgeDays} dias. No hay otra medicion en el rango para comparar.`
          : `Ultima medicion hace ${summary.measurementAgeDays} dias. Cambio vs medicion anterior: ${summary.deltaVsPreviousKg > 0 ? '+' : ''}${summary.deltaVsPreviousKg} kg; dos puntos no confirman una tendencia sostenida.`,
      metric: `${summary.currentWeightKg} kg`,
    });
  }
  return insights;
}

function weekdayLabel(weekday: number): string {
  return ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][weekday] ?? `#${weekday}`;
}

function buildDataQualityWarnings(
  entries: Awaited<ReturnType<PersonalAnalyticsRepository['findActivityTimes']>>,
  categories: Awaited<ReturnType<PersonalAnalyticsRepository['findCategoryTotals']>>,
  workouts: Awaited<ReturnType<PersonalAnalyticsRepository['findWorkoutSessions']>>,
): AnalyticsInsight[] {
  const warnings: AnalyticsInsight[] = [];
  const overlapDays = [...groupByDate(entries).values()].filter((samples) =>
    samples.reduce((sum, sample) => sum + durationHours(sample.startTime, sample.endTime, { allowCrossMidnight: true }), 0) - intervalUnionHours(samples) > 0.03,
  ).length;
  if (overlapDays) warnings.push({ id: 'overlapping-activities', area: 'data-quality', severity: 'info',
    title: `${overlapDays} fechas con actividades simultaneas`,
    detail: 'El calendario cuenta el tiempo compartido una vez; cada actividad conserva sus horas etiquetadas. Puede ser simultaneidad intencional.' });
  const hoursWithoutTimes = round2(categories.reduce((sum, category) => sum + category.totalHours, 0) -
    entries.reduce((sum, entry) => sum + durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true }), 0));
  if (hoursWithoutTimes > 0.03) warnings.push({ id: 'manual-duration-only', area: 'data-quality', severity: 'info',
    title: `${hoursWithoutTimes}h sin horario registrado`, detail: 'Se incluyen en las categorias como duracion manual, pero no se inventan horarios para el calendario.' });
  const missingDuration = workouts.filter((workout) => workout.durationMinutes <= 0).length;
  if (missingDuration) warnings.push({ id: 'training-duration-missing', area: 'data-quality', severity: 'warning',
    title: `${missingDuration} sesiones sin duracion`, detail: 'Cuentan como sesiones registradas y se excluyen del promedio de duracion.' });
  const duplicateDates = workouts.length - new Set(workouts.map((workout) => workout.workoutDate)).size;
  if (duplicateDates) warnings.push({ id: 'multiple-training-sessions', area: 'data-quality', severity: 'info',
    title: 'Hay fechas con varias sesiones', detail: 'La frecuencia cuenta dias distintos. Las sesiones se conservan para revisar si son entrenamientos separados o registros repetidos.' });
  return warnings;
}
