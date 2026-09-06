import { SUGGESTION_THRESHOLDS } from '../config/suggestion-thresholds';

// Motor estadístico puro para detectar patrones de horario/frecuencia sobre
// el historial de actividades. CERO I/O, CERO dependencia de Express/mysql2,
// y a propósito CERO parseo de fechas: recibe `weekday`/`weekKey`/`daysAgo`
// ya resueltos por quien llama (ver detect-activity-patterns.use-case.ts,
// que usa shared/utils/week.ts para eso) -- así esta calculadora es pura
// aritmética sobre números, fácil de probar con datos inventados sin tener
// que simular fechas reales.

export interface ManualTimeSample {
  weekday: number; // 0-6, Date#getUTCDay() -- mismo criterio que shared/utils/week.ts
  weekKey: string; // identifica la semana-calendario del registro (ej. ISO de su sábado de inicio); solo se usa para contar semanas DISTINTAS, nunca se interpreta como fecha acá
  startMinutes: number; // minutos desde medianoche local, 0-1439
  endMinutes: number; // idem; puede ser < startMinutes si la actividad cruza medianoche
  daysAgo: number; // días transcurridos desde hoy hasta el logDate de este registro
}

export interface WeekdayFrequency {
  weekday: number;
  sampleCount: number;
  distinctWeeks: number;
  // Proporción de semanas de la ventana analizada en las que este
  // weekday+patrón realmente ocurrió (distinctWeeks / lookbackWeeks) -- es
  // el "83% de coincidencia" que se le muestra al usuario.
  matchRatio: number;
}

export interface ScheduleEstimate {
  medianStartMinutes: number;
  medianEndMinutes: number;
  medianDurationMinutes: number;
  startDispersionMinutes: number;
  durationDispersionMinutes: number;
  crossesMidnight: boolean;
}

export interface ConfidenceInput {
  sampleCount: number;
  distinctWeeks: number;
  scheduleDispersionMinutes: number;
  daysSinceLastSample: number;
  recentDismissalsForSimilar: number;
  recentAcceptancesForSimilar: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Duración real entre dos minutos-del-día, resolviendo el cruce de
// medianoche: si end < start, se asume que la actividad terminó al día
// siguiente (ej. Dormir 23:00→07:00 = 480 min, no un número negativo).
export function resolveDurationMinutes(startMinutes: number, endMinutes: number): number {
  return endMinutes >= startMinutes ? endMinutes - startMinutes : 1440 - startMinutes + endMinutes;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error('median() requires at least one value');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

// Dispersión = desviación absoluta media respecto a la mediana. Se prefiere
// sobre desviación estándar porque es más robusta a un outlier aislado (un
// día excepcional no debe tirar abajo la confianza de 17 días consistentes).
export function averageAbsoluteDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const center = median(values);
  const total = values.reduce((sum, value) => sum + Math.abs(value - center), 0);
  return total / values.length;
}

// Agrupa por día de la semana y calcula, para cada uno, cuántas muestras y
// semanas distintas tiene, más el % de coincidencia contra la ventana
// analizada completa.
export function detectWeekdayFrequency(samples: ManualTimeSample[], lookbackWeeks: number): WeekdayFrequency[] {
  const byWeekday = new Map<number, ManualTimeSample[]>();
  for (const sample of samples) {
    const list = byWeekday.get(sample.weekday) ?? [];
    list.push(sample);
    byWeekday.set(sample.weekday, list);
  }

  const result: WeekdayFrequency[] = [];
  for (const [weekday, list] of byWeekday) {
    const distinctWeeks = new Set(list.map((sample) => sample.weekKey)).size;
    result.push({
      weekday,
      sampleCount: list.length,
      distinctWeeks,
      matchRatio: lookbackWeeks > 0 ? clamp01(distinctWeeks / lookbackWeeks) : 0,
    });
  }
  return result.sort((a, b) => b.matchRatio - a.matchRatio);
}

// Media circular de una lista de minutos-del-día (0-1439), tratados como
// ángulos en un círculo de 24h -- necesaria para elegir un punto de
// referencia sensato al "desenrollar" horas de inicio que cruzan medianoche
// (ver unwrapAroundReference). Un promedio lineal normal de, por ejemplo,
// 23:50 y 00:10 daría ~12:00 (mediodía), que es exactamente lo opuesto de lo
// correcto (~00:00) -- por eso no se puede usar `median()` directo acá.
function circularMeanMinutes(values: number[]): number {
  const radiansPerMinute = (2 * Math.PI) / 1440;
  const sumSin = values.reduce((sum, value) => sum + Math.sin(value * radiansPerMinute), 0);
  const sumCos = values.reduce((sum, value) => sum + Math.cos(value * radiansPerMinute), 0);
  const meanAngle = Math.atan2(sumSin, sumCos);
  const normalizedAngle = meanAngle < 0 ? meanAngle + 2 * Math.PI : meanAngle;
  return normalizedAngle / radiansPerMinute;
}

// Reexpresa `minutes` en la representación más cercana a `reference` sobre
// la recta numérica, permitiendo que un valor "cruce" a >1440 o <0 -- ej.
// unwrapAroundReference(0, 1400) = 1440 (medianoche expresada como "un
// poco después" de 23:20, no como "muy lejos, casi al otro lado del día").
function unwrapAroundReference(minutes: number, reference: number): number {
  const wrapped = (((minutes - reference + 720) % 1440) + 1440) % 1440;
  return reference + wrapped - 720;
}

// Mediana de horario/duración de un grupo de muestras (ya filtrado a un
// weekday o actividad puntual por quien llama).
//
// El horario de INICIO se "desenrolla" respecto a su propia media circular
// antes de calcular mediana/dispersión -- sin esto, una rutina como Dormir
// (23:00 la mayoría de los días, pero 00:00/02:00 otros días) calcularía una
// dispersión falsa de horas, porque en minutos-del-día crudos 23:00 (1380) y
// 00:00 (0) están numéricamente lejísimos aunque en la vida real son
// consecutivos. La mediana de "fin" se calcula como inicio + duración (no
// sobre el minuto-del-día crudo de fin) por la misma razón, aplicada a la
// duración en vez de al inicio.
export function buildScheduleEstimate(samples: ManualTimeSample[]): ScheduleEstimate {
  if (samples.length === 0) {
    throw new Error('buildScheduleEstimate() requires at least one sample');
  }
  const rawStarts = samples.map((sample) => sample.startMinutes);
  const circularReference = circularMeanMinutes(rawStarts);
  const unwrappedStarts = rawStarts.map((start) => unwrapAroundReference(start, circularReference));
  const durationSamples = samples.map((sample) => resolveDurationMinutes(sample.startMinutes, sample.endMinutes));

  const medianStartRaw = median(unwrappedStarts);
  const medianStartMinutes = ((medianStartRaw % 1440) + 1440) % 1440;
  const medianDurationMinutes = median(durationSamples);
  const medianEndRaw = medianStartMinutes + medianDurationMinutes;

  return {
    medianStartMinutes,
    medianEndMinutes: medianEndRaw % 1440,
    medianDurationMinutes,
    startDispersionMinutes: averageAbsoluteDeviation(unwrappedStarts),
    durationDispersionMinutes: averageAbsoluteDeviation(durationSamples),
    crossesMidnight: medianEndRaw >= 1440,
  };
}

export function hasMinimumEvidence(sampleCount: number, distinctWeeks: number): boolean {
  return (
    sampleCount >= SUGGESTION_THRESHOLDS.MIN_SAMPLE_COUNT && distinctWeeks >= SUGGESTION_THRESHOLDS.MIN_DISTINCT_WEEKS
  );
}

export function meetsShowThreshold(confidence: number): boolean {
  return confidence >= SUGGESTION_THRESHOLDS.MIN_CONFIDENCE_TO_SHOW;
}

// Fórmula de confianza -- documentada término a término:
//
//   confidence = sampleFactor * weekFactor * consistencyFactor
//              * recencyFactor * dismissalPenalty * acceptanceBoost
//
// - sampleFactor / weekFactor: crecen con la cantidad de evidencia, saturan
//   en 1.0 al doble del mínimo requerido (más muestras ayudan, pero no
//   infinitamente).
// - consistencyFactor: 1.0 si el horario es idéntico siempre, cae a 0 según
//   se acerca a MAX_DISPERSION_MINUTES_FOR_ZERO_CONFIDENCE de variación.
// - recencyFactor: 1.0 si el último registro fue hoy, cae a 0 según pasan
//   RECENCY_DECAY_DAYS sin que el patrón se repita.
// - dismissalPenalty: baja si el usuario ha descartado sugerencias
//   parecidas recientemente (señal explícita de "no quiero esto").
// - acceptanceBoost: sube (puede superar 1 antes del clamp final) si el
//   usuario ha aceptado sugerencias parecidas -- confirma que el tipo de
//   sugerencia le sirve.
//
// El resultado final se recorta a [0, 1] y se redondea a 3 decimales.
export function computeConfidence(input: ConfidenceInput): number {
  const t = SUGGESTION_THRESHOLDS;

  const sampleFactor = clamp01(input.sampleCount / (t.MIN_SAMPLE_COUNT * t.SAMPLE_FACTOR_SATURATION_MULTIPLIER));
  const weekFactor = clamp01(input.distinctWeeks / (t.MIN_DISTINCT_WEEKS * t.WEEK_FACTOR_SATURATION_MULTIPLIER));
  const consistencyFactor = clamp01(1 - input.scheduleDispersionMinutes / t.MAX_DISPERSION_MINUTES_FOR_ZERO_CONFIDENCE);
  const recencyFactor = clamp01(1 - input.daysSinceLastSample / t.RECENCY_DECAY_DAYS);
  const dismissalPenalty = clamp01(1 - input.recentDismissalsForSimilar * t.DISMISSAL_PENALTY_PER_EVENT);
  const acceptanceBoost = 1 + input.recentAcceptancesForSimilar * t.ACCEPTANCE_BOOST_PER_EVENT;

  const raw = sampleFactor * weekFactor * consistencyFactor * recencyFactor * dismissalPenalty * acceptanceBoost;
  return round(clamp01(raw), 3);
}

// Acerca gradualmente un horario sugerido hacia las correcciones recientes
// del usuario, en vez de saltar de golpe a la última corrección: el patrón
// histórico entra a la mezcla como si fuera "una corrección más" al inicio
// de la ventana, y cada corrección más reciente pesa más que la anterior
// (peso lineal creciente). Con una sola corrección aislada, el resultado se
// mueve poco; con varias correcciones consistentes, converge hacia ellas.
export function blendMinutesWithCorrections(patternMedianMinutes: number, recentCorrectionsMinutesOldestFirst: number[]): number {
  const windowed = recentCorrectionsMinutesOldestFirst.slice(-SUGGESTION_THRESHOLDS.RECENT_CORRECTIONS_WINDOW);
  if (windowed.length === 0) return Math.round(patternMedianMinutes);

  const weighted = [patternMedianMinutes, ...windowed];
  let weightedSum = 0;
  let weightTotal = 0;
  weighted.forEach((value, index) => {
    const weight = index + 1;
    weightedSum += value * weight;
    weightTotal += weight;
  });
  return Math.round(weightedSum / weightTotal);
}

export function parseHHMMToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function formatMinutesAsHHMM(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = Math.round(normalized % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
