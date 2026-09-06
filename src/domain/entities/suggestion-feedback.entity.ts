export type SuggestionFeedbackAction = 'accepted' | 'accepted_with_changes' | 'dismissed' | 'ignored' | 'expired';

// Registro append-only de qué hizo el usuario con una sugerencia -- nunca se
// edita después de creado (es historial), por eso es una interfaz plana sin
// invariantes propias, igual que ActivityLog.
export interface SuggestionFeedback {
  id: string;
  suggestionId: string;
  userId: string;
  action: SuggestionFeedbackAction;
  // Lo que el sistema propuso originalmente (snapshot de
  // ActivitySuggestion.suggestedValuesSnapshot() al momento de decidir).
  originalValues: Record<string, unknown>;
  // Lo que finalmente quedó, si el usuario editó antes de aceptar
  // (accepted_with_changes) -- null si aceptó tal cual o si descartó.
  finalValues: Record<string, unknown> | null;
  createdAt: Date;
}
