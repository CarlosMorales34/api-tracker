// Días de la semana (0=domingo..6=sábado, criterio Date#getDay()) que el
// usuario marcó a propósito como descanso -- Entrenamientos no debe perder
// la racha en esos días aunque no haya workouts, a diferencia de cualquier
// otro día sin entrenar.
export interface UserTrainingSettings {
  restWeekdays: number[];
}

export const DEFAULT_USER_TRAINING_SETTINGS: UserTrainingSettings = {
  restWeekdays: [],
};
