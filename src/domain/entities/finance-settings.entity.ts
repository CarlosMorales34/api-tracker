export type Currency = 'MXN' | 'USD';

// Settings de 1 fila por usuario (PK = user_id): sin identidad propia ni
// invariantes de negocio más allá del storage, así que se modela como
// interfaz plana en vez de forzar una clase con create()/toJSON() vacíos.
export interface FinanceSettings {
  debtTotal: number;
  currency: Currency;
  // Fecha ancla opcional (YYYY-MM-DD) que define cuándo empieza "semana 1"
  // para la numeración de semanas que muestra Finanzas -- no afecta el
  // agrupamiento sábado-a-viernes real de finance_entries.
  week1AnchorDate: string | null;
  // Saldo de cartera (liquidez: efectivo/débito). El usuario lo corrige a
  // mano cuando quiere (ej. contó su dinero físico) y la app lo ajusta
  // automáticamente al crear/editar/borrar ingresos y gastos variables.
  walletBalance: number;
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  debtTotal: 0,
  currency: 'MXN',
  week1AnchorDate: null,
  walletBalance: 0,
};
