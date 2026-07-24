export type Currency = 'MXN' | 'USD';

// Settings de 1 fila por usuario (PK = user_id): sin identidad propia ni
// invariantes de negocio más allá del storage, así que se modela como
// interfaz plana en vez de forzar una clase con create()/toJSON() vacíos.
export interface FinanceSettings {
  debtTotal: number;
  currency: Currency;
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = { debtTotal: 0, currency: 'MXN' };
