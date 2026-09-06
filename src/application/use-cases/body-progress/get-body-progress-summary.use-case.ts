import { BodyGoalRepository } from '../../../domain/repositories/body-goal.repository';
import { BodyMeasurementRepository } from '../../../domain/repositories/body-measurement.repository';
import {
  currentWeight,
  deltaForPeriod,
  distanceToGoal,
  interpretProgress,
  percentProgress,
  totalChangeSinceStart,
  trend,
  Trend,
  weeklyPace,
  WeightPoint,
} from '../../../shared/utils/body-progress-calculations';
import { addDaysUTC, formatDateOnly, parseDateOnly, todayDateOnly } from '../../../shared/utils/week';

const RECENT_WINDOW_DAYS = 90;
const PERIOD_DAYS = 30;

export interface BodyProgressSummary {
  currentWeightKg: number | null;
  deltaVsPreviousPeriod: number | null;
  totalChangeSinceStart: number | null;
  distanceToGoal: number | null;
  percentProgress: number | null;
  weeklyPaceKg: number | null;
  trend: Trend;
  isProgressFavorable: boolean | null;
  goal: {
    id: string;
    goalType: string;
    startWeightKg: number;
    targetWeightKg: number | null;
    startDate: string;
    targetDate: string | null;
  } | null;
  latestMeasurement: {
    id: string;
    measuredAt: string;
    weightKg: number | null;
  } | null;
}

// Junta goal activo + mediciones recientes en un solo indicador -- vive
// aparte de los use-cases de CRUD porque combina dos repos y solo produce
// datos de lectura (nunca escribe), y los cálculos en sí son funciones
// puras y testeables (ver shared/utils/body-progress-calculations.ts) para
// no enterrar la lógica de negocio dentro de este orquestador.
export class GetBodyProgressSummaryUseCase {
  constructor(
    private readonly bodyMeasurementRepository: BodyMeasurementRepository,
    private readonly bodyGoalRepository: BodyGoalRepository,
  ) {}

  async execute(userId: string): Promise<BodyProgressSummary> {
    const today = todayDateOnly();
    const windowStart = addDaysUTC(parseDateOnly(today), -RECENT_WINDOW_DAYS);

    const [goal, latest, recentMeasurements] = await Promise.all([
      this.bodyGoalRepository.findActive(userId),
      this.bodyMeasurementRepository.findLatest(userId),
      this.bodyMeasurementRepository.findByUserAndDateRange(userId, formatDateOnly(windowStart), today),
    ]);

    const weightPoints: WeightPoint[] = recentMeasurements
      .filter((m) => m.weightKg !== null)
      .map((m) => ({ measuredAt: m.measuredAt, weightKg: m.weightKg! }));

    const current = latest?.weightKg ?? currentWeight(weightPoints);
    const periodStart = addDaysUTC(parseDateOnly(today), -PERIOD_DAYS);
    const deltaVsPreviousPeriod = deltaForPeriod(weightPoints, periodStart);
    const changeSinceStart = totalChangeSinceStart(current, goal?.startWeightKg ?? null);
    const goalDistance = distanceToGoal(current, goal?.targetWeightKg ?? null);
    const progress = percentProgress(goal?.startWeightKg ?? null, current, goal?.targetWeightKg ?? null);
    const pace = weeklyPace(weightPoints);

    return {
      currentWeightKg: current,
      deltaVsPreviousPeriod,
      totalChangeSinceStart: changeSinceStart,
      distanceToGoal: goalDistance,
      percentProgress: progress,
      weeklyPaceKg: pace,
      trend: trend(deltaVsPreviousPeriod),
      isProgressFavorable: goal ? interpretProgress(goal.goalType, deltaVsPreviousPeriod) : null,
      goal: goal
        ? {
            id: goal.id,
            goalType: goal.goalType,
            startWeightKg: goal.startWeightKg,
            targetWeightKg: goal.targetWeightKg,
            startDate: goal.startDate,
            targetDate: goal.targetDate,
          }
        : null,
      latestMeasurement: latest
        ? { id: latest.id, measuredAt: latest.measuredAt.toISOString(), weightKg: latest.weightKg }
        : null,
    };
  }
}
