import { FinanceSettings } from '../../../domain/entities/finance-settings.entity';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { DomainError } from '../../../domain/errors/domain.error';
import { formatDateOnly, getWeekStart, parseDateOnly } from '../../../shared/utils/week';
import { UpdateFinanceSettingsDto } from '../../dtos/update-finance-settings.dto';

export class UpdateFinanceSettingsUseCase {
  constructor(private readonly financeSettingsRepository: FinanceSettingsRepository) {}

  async execute(userId: string, dto: UpdateFinanceSettingsDto): Promise<FinanceSettings> {
    if (dto.week1AnchorDate) {
      const date = parseDateOnly(dto.week1AnchorDate);
      if (formatDateOnly(getWeekStart(date)) !== dto.week1AnchorDate) {
        throw new DomainError('La fecha ancla de "Semana 1" debe caer en sábado, igual que el resto de las semanas de la app');
      }
    }
    return this.financeSettingsRepository.upsert(userId, dto);
  }
}
