import { FinanceAdjustment } from '../../../domain/entities/finance-adjustment.entity';
import { FinanceSettings } from '../../../domain/entities/finance-settings.entity';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { DomainError } from '../../../domain/errors/domain.error';
import { ReconcileWalletDto } from '../../dtos/reconcile-wallet.dto';

// Reemplaza el sobrescribir directo de wallet_balance: calcula la
// diferencia contra el saldo calculado, la deja registrada como
// FinanceAdjustment auditable, y aplica el nuevo saldo -- mismo resultado
// final para el usuario, ahora con rastro de "de cuánto a cuánto, por qué".
export class ReconcileWalletUseCase {
  constructor(private readonly financeSettingsRepository: FinanceSettingsRepository) {}

  async execute(userId: string, dto: ReconcileWalletDto): Promise<{ settings: FinanceSettings; adjustment: FinanceAdjustment }> {
    if (!Number.isFinite(dto.countedBalance)) {
      throw new DomainError('El saldo contado debe ser un número');
    }
    return this.financeSettingsRepository.reconcileWallet(userId, dto.countedBalance, dto.reason ?? null);
  }
}
