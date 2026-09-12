import { DEFAULT_FINANCE_SETTINGS } from '../../../domain/entities/finance-settings.entity';
import { MonthlyBudget } from '../../../domain/entities/monthly-budget.entity';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { MonthlyBudgetRepository } from '../../../domain/repositories/monthly-budget.repository';
import { DomainError } from '../../../domain/errors/domain.error';
import { UpdateMonthlyBudgetDto } from '../../dtos/update-monthly-budget.dto';

export class UpdateMonthlyBudgetUseCase {
  constructor(
    private readonly monthlyBudgetRepository: MonthlyBudgetRepository,
    private readonly financeSettingsRepository: FinanceSettingsRepository,
  ) {}

  async execute(userId: string, dto: UpdateMonthlyBudgetDto): Promise<MonthlyBudget> {
    if (!Number.isFinite(dto.amount) || dto.amount < 0) {
      throw new DomainError('El presupuesto mensual debe ser un número mayor o igual a 0');
    }
    const settings = (await this.financeSettingsRepository.find(userId)) ?? DEFAULT_FINANCE_SETTINGS;
    return this.monthlyBudgetRepository.upsert(userId, {
      year: dto.year,
      month: dto.month,
      amount: dto.amount,
      currency: settings.currency,
    });
  }
}
