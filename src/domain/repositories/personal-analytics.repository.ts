export interface AnalyticsRoutineTimeEntry {
  routineId: string;
  routineName: string;
  isSleep: boolean;
  logDate: string;
  startTime: string;
  endTime: string;
}

export interface AnalyticsActivityTimeEntry {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  activityId: string;
  activityName: string;
  logDate: string;
  startTime: string;
  endTime: string;
  source: 'manual' | 'routine';
  sourceRoutineId: string | null;
  sourceRoutineName: string | null;
}

export interface AnalyticsCategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalHours: number;
  activeDays: number;
}

export interface AnalyticsActivityTotal {
  categoryId: string;
  categoryName: string;
  activityId: string;
  activityName: string;
  totalHours: number;
  activeDays: number;
}

export interface AnalyticsWorkoutSession {
  workoutId: string;
  workoutDate: string;
  durationMinutes: number;
  exerciseCount: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
}

export interface AnalyticsExerciseTotal {
  exerciseName: string;
  appearances: number;
  lastDate: string;
  avgWeight: number | null;
  maxWeight: number | null;
  totalReps: number;
  totalVolume: number;
}

export interface AnalyticsBodyMeasurementPoint {
  measuredAt: string;
  weightKg: number | null;
  bodyFatPercentage: number | null;
  waistCm: number | null;
}

export interface AnalyticsBodyGoalSnapshot {
  goalType: 'lose' | 'gain' | 'maintain' | 'recomp';
  startWeightKg: number;
  targetWeightKg: number | null;
  startDate: string;
  targetDate: string | null;
}

export interface PersonalAnalyticsRepository {
  findRoutineTimes(userId: string, from: string, to: string): Promise<AnalyticsRoutineTimeEntry[]>;
  findActivityTimes(userId: string, from: string, to: string): Promise<AnalyticsActivityTimeEntry[]>;
  findCategoryTotals(userId: string, from: string, to: string): Promise<AnalyticsCategoryTotal[]>;
  findActivityTotals(userId: string, from: string, to: string): Promise<AnalyticsActivityTotal[]>;
  findWorkoutSessions(userId: string, from: string, to: string): Promise<AnalyticsWorkoutSession[]>;
  findExerciseTotals(userId: string, from: string, to: string): Promise<AnalyticsExerciseTotal[]>;
  findBodyMeasurements(userId: string, from: string, to: string): Promise<AnalyticsBodyMeasurementPoint[]>;
  findActiveBodyGoal(userId: string): Promise<AnalyticsBodyGoalSnapshot | null>;
}
