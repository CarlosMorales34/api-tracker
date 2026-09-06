// Qué dominios de la app tiene habilitados el usuario -- ver
// sql/031_create_user_module_settings.sql para el detalle de por qué es una
// tabla propia (eager, no lazy como las demás *_settings).
export interface UserModuleSettings {
  hasActivities: boolean;
  hasFinance: boolean;
  hasHealth: boolean;
}

export const DEFAULT_USER_MODULE_SETTINGS: UserModuleSettings = {
  hasActivities: true,
  hasFinance: true,
  hasHealth: true,
};
