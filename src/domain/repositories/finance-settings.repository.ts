import { Currency, FinanceSettings } from '../entities/finance-settings.entity';

export interface FinanceSettingsRepository {
  find(userId: string): Promise<FinanceSettings | null>;
  upsert(
    userId: string,
    changes: { debtTotal?: number; currency?: Currency; week1AnchorDate?: string | null },
  ): Promise<FinanceSettings>;
  // Fija el saldo de cartera a un valor absoluto (corrección manual).
  setWalletBalance(userId: string, balance: number): Promise<FinanceSettings>;
  // Ajusta el saldo de cartera por un delta (positivo o negativo) -- usado
  // por creación/edición/borrado de ingresos y gastos variables. Atómico vía
  // SQL (no read-modify-write) para evitar carreras entre ajustes.
  adjustWalletBalance(userId: string, delta: number): Promise<void>;
}
