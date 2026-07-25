export interface RoutineLogTime {
  start: string;
  end: string | null;
}

export interface RoutineLogRepository {
  findTimesByRoutineAndDate(routineId: string, logDate: string): Promise<RoutineLogTime[]>;
  // Batch fetch para listar varias rutinas con sus horarios de un mismo día
  // en un solo viaje, en vez de una query por rutina.
  findTimesByRoutineIdsAndDate(routineIds: string[], logDate: string): Promise<Map<string, RoutineLogTime[]>>;
  // times vacío borra el registro del día (routine_logs + routine_log_times
  // vía ON DELETE CASCADE); si no, reemplaza los rangos existentes por los nuevos.
  upsert(routineId: string, logDate: string, times: RoutineLogTime[]): Promise<void>;
}
