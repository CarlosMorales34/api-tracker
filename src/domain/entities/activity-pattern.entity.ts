// "Patrón detectado" -- inferencia calculada a partir del historial de una
// actividad. A propósito NO es una entidad persistida (no tiene tabla ni
// id): se recalcula on-demand cada vez que se piden sugerencias nuevas, para
// que nunca se mezcle con ActivitySuggestion (la propuesta) ni con
// SuggestionFeedback (la decisión del usuario) en una sola tabla.
export interface ActivityPattern {
  activityId: string;
  activityName: string;
  categoryId: string;
  // Días 0-6 (Date#getUTCDay()) donde el patrón tiene evidencia suficiente,
  // ascendente. Ej. [1,2,3,4,5] = lunes a viernes.
  weekdays: number[];
  sampleCount: number;
  distinctWeeks: number;
  // Promedio del % de coincidencia (semanas con el patrón / semanas de la
  // ventana analizada) de los weekdays incluidos.
  matchRatio: number;
  startTime: string; // 'HH:MM', mediana
  endTime: string; // 'HH:MM', mediana
  durationMinutes: number;
  crossesMidnight: boolean;
  lastSeenDaysAgo: number;
  startDispersionMinutes: number;
  durationDispersionMinutes: number;
}
