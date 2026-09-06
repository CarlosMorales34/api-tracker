import { BodyGoalType } from '../../domain/entities/body-goal.entity';

// Funciones puras (sin I/O, sin dependencias de framework) para los
// indicadores de Progreso corporal -- separadas de use-cases/controllers a
// propósito, para poder probarlas sin mockear repos ni Express. Todas
// devuelven null en vez de tirar cuando falta información (medición única,
// sin meta, período sin datos) en vez de asumir un valor.

export interface WeightPoint {
  measuredAt: Date;
  weightKg: number;
}

export type Trend = 'up' | 'down' | 'stable';

const STABLE_THRESHOLD_KG = 0.1;

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Última medición con peso, la serie no viene garantizada ordenada.
export function currentWeight(points: WeightPoint[]): number | null {
  if (points.length === 0) return null;
  return [...points].sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0]!.weightKg;
}

// Cambio entre el valor actual y el valor vigente al inicio del período
// (ej. "hace 30 días") -- null si no hay ninguna medición en o antes de esa
// fecha de referencia (no se puede comparar contra nada).
export function deltaForPeriod(points: WeightPoint[], periodStart: Date): number | null {
  const current = currentWeight(points);
  if (current === null) return null;
  const before = [...points]
    .filter((p) => p.measuredAt.getTime() <= periodStart.getTime())
    .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
  if (!before) return null;
  return round2(current - before.weightKg);
}

export function totalChangeSinceStart(current: number | null, startWeightKg: number | null): number | null {
  if (current === null || startWeightKg === null) return null;
  return round2(current - startWeightKg);
}

// Para 'maintain'/'recomp' sin un único target numérico, la distancia no
// aplica -- se devuelve null en vez de inventar un número engañoso.
export function distanceToGoal(current: number | null, targetWeightKg: number | null): number | null {
  if (current === null || targetWeightKg === null) return null;
  return round2(targetWeightKg - current);
}

// % de avance entre el peso inicial y la meta -- 100 = meta alcanzada o
// superada, 0 = sin avance, puede pasar de 100 (se deja así, no se recorta,
// para que la UI pueda mostrarlo como "superaste tu meta" si aplica).
// null si start === target (división por cero) o falta algún dato.
export function percentProgress(
  startWeightKg: number | null,
  current: number | null,
  targetWeightKg: number | null,
): number | null {
  if (startWeightKg === null || current === null || targetWeightKg === null) return null;
  const totalDistance = targetWeightKg - startWeightKg;
  if (totalDistance === 0) return null;
  const covered = current - startWeightKg;
  return Math.round((covered / totalDistance) * 100);
}

// Promedio móvil de 7 días TERMINANDO en cada medición -- suaviza ruido
// diario (retención de líquidos, etc.) sin esconder la tendencia real.
// Requiere >=1 punto en la ventana; si una fecha no tiene mediciones previas
// en los 7 días, no se incluye en el resultado.
export function movingAverage7d(points: WeightPoint[]): { date: Date; average: number }[] {
  const sorted = [...points].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  return sorted.map((point) => {
    const windowStart = point.measuredAt.getTime() - WINDOW_MS;
    const inWindow = sorted.filter(
      (p) => p.measuredAt.getTime() > windowStart && p.measuredAt.getTime() <= point.measuredAt.getTime(),
    );
    const sum = inWindow.reduce((total, p) => total + p.weightKg, 0);
    return { date: point.measuredAt, average: round2(sum / inWindow.length) };
  });
}

// Ritmo semanal: pendiente (kg/semana) entre la primera y última medición
// del período dado -- null si hay menos de 2 puntos o abarcan menos de un
// día (evita dividir entre ~0 y devolver un número absurdo).
export function weeklyPace(points: WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const daysSpan = (last.measuredAt.getTime() - first.measuredAt.getTime()) / (24 * 60 * 60 * 1000);
  if (daysSpan < 1) return null;
  const totalChange = last.weightKg - first.weightKg;
  return round2((totalChange / daysSpan) * 7);
}

// Tendencia cruda (sube/baja/estable) según el signo del cambio -- NO
// implica "bien" o "mal", eso depende de goalType (ver interpretProgress).
export function trend(deltaKg: number | null): Trend {
  if (deltaKg === null || Math.abs(deltaKg) <= STABLE_THRESHOLD_KG) return 'stable';
  return deltaKg > 0 ? 'up' : 'down';
}

// Si el cambio observado representa avance hacia la meta, según el tipo de
// objetivo -- 'lose' mejora bajando, 'gain' mejora subiendo, 'maintain'
// importa la desviación (no la dirección), 'recomp' no asume nada (null:
// que la UI no lo muestre como bueno/malo, solo como dato).
export function interpretProgress(goalType: BodyGoalType, deltaKg: number | null): boolean | null {
  if (deltaKg === null) return null;
  if (Math.abs(deltaKg) <= STABLE_THRESHOLD_KG) return null;
  if (goalType === 'lose') return deltaKg < 0;
  if (goalType === 'gain') return deltaKg > 0;
  return null;
}
