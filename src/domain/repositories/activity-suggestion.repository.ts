import { ActivitySuggestion, SuggestionStatus, SuggestionType } from '../entities/activity-suggestion.entity';

export interface SuggestionTarget {
  suggestionType: SuggestionType;
  activityId: string | null;
  routineId: string | null;
  categoryId: string | null;
}

export interface ActivitySuggestionRepository {
  save(suggestion: ActivitySuggestion): Promise<void>;
  findById(id: string): Promise<ActivitySuggestion | null>;
  findPendingByUser(userId: string): Promise<ActivitySuggestion[]>;
  // Evita generar una sugerencia duplicada del mismo patrón mientras la
  // anterior sigue pendiente (mismo tipo + mismo objetivo relacionado).
  findPendingDuplicate(userId: string, target: SuggestionTarget): Promise<ActivitySuggestion | null>;
  // Cuenta sugerencias de este tipo/objetivo que tuvieron alguno de los
  // `statuses` desde `sinceDate` -- alimenta el dismissal/acceptance factor
  // de computeConfidence().
  countRecentByStatusForTarget(
    userId: string,
    target: Pick<SuggestionTarget, 'suggestionType' | 'activityId' | 'routineId'>,
    statuses: SuggestionStatus[],
    sinceDate: Date,
  ): Promise<number>;
  updateStatus(id: string, status: SuggestionStatus): Promise<void>;
  // "El usuario debe poder borrar su historial de sugerencias."
  deleteAllByUser(userId: string): Promise<void>;
}
