// El usuario puede desactivar todo el motor de sugerencias de Actividades
// desde un solo interruptor -- ver sql/033_create_activity_suggestions.sql.
export interface UserSuggestionSettings {
  suggestionsEnabled: boolean;
}

export const DEFAULT_USER_SUGGESTION_SETTINGS: UserSuggestionSettings = {
  suggestionsEnabled: true,
};
