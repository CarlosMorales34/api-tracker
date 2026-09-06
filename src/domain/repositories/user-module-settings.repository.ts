import { UserModuleSettings } from '../entities/user-module-settings.entity';

export interface UserModuleSettingsRepository {
  find(userId: string): Promise<UserModuleSettings | null>;
  // Usado tanto al registrar (fila inicial) como al cambiar desde Ajustes.
  upsert(userId: string, settings: UserModuleSettings): Promise<UserModuleSettings>;
}
