// Análogo a ActivityPattern pero para rutinas fijas -- mismo motivo de no
// persistirse (se recalcula on-demand desde routine_log_times). Existe
// aparte en vez de generalizar ActivityPattern porque la fuente de datos y
// las reglas de filtrado son distintas (acá no hay concepto de
// source='manual'/'routine' que filtrar, y sí importa `isSleep`).
export interface RoutinePattern {
  routineId: string;
  routineName: string;
  isSleep: boolean;
  weekdays: number[];
  sampleCount: number;
  distinctWeeks: number;
  matchRatio: number;
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
  durationMinutes: number;
  crossesMidnight: boolean;
  lastSeenDaysAgo: number;
  startDispersionMinutes: number;
  durationDispersionMinutes: number;
}
