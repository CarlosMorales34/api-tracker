import { SuggestionFeedback } from '../entities/suggestion-feedback.entity';

export interface SuggestionFeedbackRepository {
  save(feedback: SuggestionFeedback): Promise<void>;
  // Correcciones recientes (accepted_with_changes) para un objetivo puntual
  // (misma actividad o misma rutina), en orden cronológico ascendente (más
  // antigua primero) -- así entran directo a blendMinutesWithCorrections().
  findRecentCorrectionsForTarget(
    userId: string,
    target: { activityId: string | null; routineId: string | null },
    limit: number,
  ): Promise<SuggestionFeedback[]>;
  // "El usuario debe poder borrar su historial de sugerencias."
  deleteAllByUser(userId: string): Promise<void>;
}
