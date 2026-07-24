import { FinanceSettings } from '../../../domain/entities/finance-settings.entity';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { UpdateFinanceSettingsDto } from '../../dtos/update-finance-settings.dto';

export class UpdateFinanceSettingsUseCase {
  constructor(private readonly financeSettingsRepository: FinanceSettingsRepository) {}

  async execute(userId: string, dto: UpdateFinanceSettingsDto): Promise<FinanceSettings> {
    return this.financeSettingsRepository.upsert(userId, dto);
  }
}
