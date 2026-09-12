import { FinanceAdjustment } from '../entities/finance-adjustment.entity';
import { Currency, FinanceSettings } from '../entities/finance-settings.entity';

export interface FinanceSettingsRepository {
  find(userId: string): Promise<FinanceSettings | null>;
  upsert(
    userId: string,
    changes: { debtTotal?: number; currency?: Currency; week1AnchorDate?: string | null },
  ): Promise<FinanceSettings>;
  // Ajusta el saldo de cartera por un delta (positivo o negativo) -- usado
  // por creación/edición/borrado de ingresos y gastos variables. Atómico vía
  // SQL (no read-modify-write) para evitar carreras entre ajustes.
  adjustWalletBalance(userId: string, delta: number): Promise<void>;
  // Conciliación: reemplaza el sobrescribir directo de setWalletBalance.
  // Calcula la diferencia contra el saldo actual, la registra como
  // FinanceAdjustment (target='wallet') y aplica el nuevo saldo, todo en una
  // transacción.
  reconcileWallet(userId: string, countedBalance: number, reason: string | null): Promise<{ settings: FinanceSettings; adjustment: FinanceAdjustment }>;
}
