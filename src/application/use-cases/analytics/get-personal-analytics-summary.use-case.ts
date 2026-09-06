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
} from '../../../shared/utils/analytics-calculations';
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
  };
  timeline: {
    date: string;
    sleepHours: number;
    workHours: number;
    activityHours: number;
    workoutMinutes: number;
    weightKg: number | null;
  }[];
  dataQuality: {
    warnings: AnalyticsInsight[];
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

    const [
      routineTimes,
      activityTimes,
      categoryTotals,
      activityTotals,
      workoutSessions,
      exerciseTotals,
      bodyMeasurements,
      bodyGoal,
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
      ]);

    const dataQualityWarnings: AnalyticsInsight[] = [];
    const sleep = buildSleepSummary(routineTimes);
    const work = buildWorkSummary(routineTimes, activityTimes);
    const activities = buildActivitiesSummary(categoryTotals, activityTotals);
    const training = buildTrainingSummary(workoutSessions, exerciseTotals, days);
    const body = buildBodySummary(bodyMeasurements, bodyGoal);
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
  const samples = routineTimes.filter((entry) => entry.isSleep);
  const durations = samples.map((entry) => durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true }));
  const starts = samples.map((entry) => parseTimeToMinutes(entry.startTime));
  const ends = samples.map((entry) => parseTimeToMinutes(entry.endTime));
  const medianStart = median(starts);
  const medianEnd = median(ends);

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
    byDate.set(date, { date, sleepHours: 0, workHours: 0, activityHours: 0, workoutMinutes: 0, weightKg: null });
  }

  for (const entry of routineTimes) {
    const row = byDate.get(entry.logDate);
    if (!row) continue;
    const hours = durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true });
    if (entry.isSleep) row.sleepHours = round2(row.sleepHours + hours);
    else if (looksLikeWork(entry.routineName)) row.workHours = round2(row.workHours + hours);
  }

  const routineWorkKeys = new Set(
    routineTimes
      .filter((entry) => !entry.isSleep && looksLikeWork(entry.routineName))
      .map((entry) => timeSampleKey(entry.logDate, entry.startTime, entry.endTime)),
  );
  for (const entry of activityTimes) {
    const row = byDate.get(entry.logDate);
    if (!row) continue;
    const hours = durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true });
    row.activityHours = round2(row.activityHours + hours);
    if (looksLikeProgramming(entry.activityName) && !routineWorkKeys.has(timeSampleKey(entry.logDate, entry.startTime, entry.endTime))) {
      row.workHours = round2(row.workHours + hours);
    }
  }

  for (const workout of workouts) {
    const row = byDate.get(workout.workoutDate);
    if (!row) continue;
    row.workoutMinutes = round2(row.workoutMinutes + workout.durationMinutes);
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
  const samples = [...samplesByTime.values()];
  const durations = samples.map((entry) => durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true }));
  const starts = samples.map((entry) => parseTimeToMinutes(entry.startTime));
  const medianStart = median(starts);
  const medianDuration = median(durations);
  const buckets = new Map<string, number>();
  for (const entry of samples) {
    const bucket = formatMinutesAsTime(Math.floor(parseTimeToMinutes(entry.startTime) / 30) * 30);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  const mostFrequentStartBucket = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    hasData: samples.length > 0,
    days: new Set(samples.map((entry) => entry.logDate)).size,
    samples: samples.length,
    totalHours: round2(durations.reduce((sum, duration) => sum + duration, 0)),
    medianStartTime: medianStart === null ? null : formatMinutesAsTime(medianStart),
    medianEndTime: medianStart === null || medianDuration === null ? null : formatMinutesAsTime(medianStart + medianDuration * 60),
    averageBlockHours: average(durations) === null ? null : round2(average(durations)!),
    mostFrequentStartBucket,
    weekdayAverages: weekdayAverages(samples.map((entry) => ({ weekday: weekdayOf(entry.logDate), value: durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true }) }))),
  };
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
  return totalHours >= 3 || activeDays >= 3;
}

function insufficientActivityMessage(totalHours: number, activeDays: number): string {
  if (totalHours <= 0 || activeDays <= 0) return 'Todavia no hay registros en este rango.';
  return 'Aun hay pocos datos para sacar una tendencia confiable.';
}

function buildTrainingSummary(
  workoutSessions: Awaited<ReturnType<PersonalAnalyticsRepository['findWorkoutSessions']>>,
  exerciseTotals: Awaited<ReturnType<PersonalAnalyticsRepository['findExerciseTotals']>>,
  days: number,
) {
  const durations = workoutSessions.map((session) => session.durationMinutes);
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
    sessionsPerWeek: round2(workoutSessions.length / Math.max(days / 7, 1)),
    lastWorkoutDate: workoutSessions.at(-1)?.workoutDate ?? null,
    weekdayCounts: [...byWeekday.entries()]
      .map(([weekday, sessions]) => ({
        weekday,
        sessions: sessions.length,
        averageMinutes: Math.round(average(sessions.map((session) => session.durationMinutes)) ?? 0),
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
) {
  const weightPoints = measurements.filter((measurement) => measurement.weightKg !== null);
  const latest = weightPoints.at(-1) ?? null;
  const previous = weightPoints.at(-2) ?? null;
  const delta = latest && previous ? round2(latest.weightKg! - previous.weightKg!) : null;
  const distance = latest && goal?.targetWeightKg !== null && goal?.targetWeightKg !== undefined ? round2(goal.targetWeightKg - latest.weightKg!) : null;
  const trendVsGoal: PersonalAnalyticsSummary['body']['trendVsGoal'] = (() => {
    if (!goal || delta === null || delta === 0) return delta === 0 ? 'neutral' : null;
    if (goal.goalType === 'gain') return delta > 0 ? 'favorable' : 'unfavorable';
    if (goal.goalType === 'lose') return delta < 0 ? 'favorable' : 'unfavorable';
    return 'neutral';
  })();

  return {
    hasData: latest !== null,
    currentWeightKg: latest?.weightKg ?? null,
    previousWeightKg: previous?.weightKg ?? null,
    deltaVsPreviousKg: delta,
    goalType: goal?.goalType ?? null,
    targetWeightKg: goal?.targetWeightKg ?? null,
    distanceToTargetKg: distance,
    trendVsGoal,
    latestMeasurementAt: latest?.measuredAt ?? null,
  };
}

function buildSleepInsights(summary: PersonalAnalyticsSummary['sleep']): AnalyticsInsight[] {
  if (!summary.hasData) return [];
  const insights: AnalyticsInsight[] = [];
  if (summary.medianHours !== null) {
    insights.push({
      id: 'sleep-duration',
      area: 'sleep',
      severity: summary.medianHours >= 7 && summary.medianHours <= 9 ? 'positive' : 'warning',
      title: `Sueño mediano de ${summary.medianHours}h`,
      detail:
        summary.medianBedtime && summary.medianWakeTime
          ? `Tu bloque típico va de ${summary.medianBedtime} a ${summary.medianWakeTime}.`
          : 'Ya hay suficientes registros para seguir tendencia de descanso.',
      metric: `${summary.medianHours}h`,
    });
  }
  const weakestDay = [...summary.weekdayAverages].sort((a, b) => a.averageHours - b.averageHours)[0];
  if (weakestDay && weakestDay.averageHours < 7) {
    insights.push({
      id: 'sleep-weak-weekday',
      area: 'sleep',
      severity: 'warning',
      title: 'Hay un dia de sueño bajo recurrente',
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
      title: 'Bloque principal de trabajo detectado',
      detail:
        summary.medianStartTime && summary.medianEndTime
          ? `Tu bloque mediano va de ${summary.medianStartTime} a ${summary.medianEndTime}; el inicio mas frecuente cae cerca de ${summary.mostFrequentStartBucket}.`
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
      severity: top.sharePercent >= 60 ? 'warning' : 'info',
      title: `${top.name} concentra ${top.sharePercent}% del tiempo`,
      detail: `Suma ${top.totalHours}h en el rango. Si mezcla trabajo, estudio y crecimiento, conviene separar actividades para conclusiones mas limpias.`,
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
      severity: summary.sessionsPerWeek >= 3 ? 'positive' : 'warning',
      title: `${summary.sessionsPerWeek} entrenamientos por semana`,
      detail:
        summary.lastWorkoutDate === null
          ? 'Todavia no hay una ultima sesion identificable.'
          : `Ultima sesion registrada: ${summary.lastWorkoutDate}. Antes de optimizar carga, conviene estabilizar frecuencia.`,
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
      title: `Faltan ${Math.abs(summary.distanceToTargetKg)} kg para la meta`,
      detail:
        summary.deltaVsPreviousKg === null
          ? `Meta actual: ${summary.targetWeightKg} kg.`
          : `Cambio vs medicion anterior: ${summary.deltaVsPreviousKg > 0 ? '+' : ''}${summary.deltaVsPreviousKg} kg.`,
      metric: `${summary.currentWeightKg} kg`,
    });
  }
  return insights;
}

function weekdayLabel(weekday: number): string {
  return ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][weekday] ?? `#${weekday}`;
}
