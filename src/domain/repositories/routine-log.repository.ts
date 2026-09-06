export interface RoutineLogTime {
  start: string;
  end: string | null;
}

// Historial de una rutina type='range' para el detector de patrones (ver
// activity-pattern-calculations.ts) -- a diferencia de las actividades, acá
// no hay que filtrar por "source" (routine_log_times siempre es captura
// directa del usuario, nunca reflejada de otra cosa), pero sí se excluyen
// las filas sin end_time (rutinas type='single', ej. "Cena", no tienen
// duración que analizar).
export interface ManualRoutineTimeEntry {
  routineId: string;
  routineName: string;
  isSleep: boolean;
  logDate: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
}

export interface RoutineLogRepository {
  findTimesByRoutineAndDate(routineId: string, logDate: string): Promise<RoutineLogTime[]>;
  // Batch fetch para listar varias rutinas con sus horarios de un mismo día
  // en un solo viaje, en vez de una query por rutina.
  findTimesByRoutineIdsAndDate(routineIds: string[], logDate: string): Promise<Map<string, RoutineLogTime[]>>;
  findTimesByUserAndDateRange(userId: string, from: string, to: string): Promise<ManualRoutineTimeEntry[]>;
  // times vacío borra el registro del día (routine_logs + routine_log_times
  // vía ON DELETE CASCADE); si no, reemplaza los rangos existentes por los nuevos.
  upsert(routineId: string, logDate: string, times: RoutineLogTime[]): Promise<void>;
}
