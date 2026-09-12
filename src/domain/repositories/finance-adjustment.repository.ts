import { FinanceAdjustment, FinanceAdjustmentTarget } from '../entities/finance-adjustment.entity';

// Solo lectura -- la escritura ocurre dentro de la misma transacción que
// aplica el ajuste (ver MysqlFinanceSettingsRepository.reconcileWallet /
// MysqlCreditCardRepository.reconcileAmountOwed), no desde acá, para
// garantizar una sola conexión/transacción por operación.
export interface FinanceAdjustmentRepository {
  findRecentByUserAndTarget(
    userId: string,
    target: FinanceAdjustmentTarget,
    targetId: string | null,
    limit: number,
  ): Promise<FinanceAdjustment[]>;
}
