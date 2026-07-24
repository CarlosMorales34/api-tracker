import { ProductivitySettings } from '../entities/productivity-settings.entity';

export interface ProductivitySettingsRepository {
  find(userId: string): Promise<ProductivitySettings | null>;
}
