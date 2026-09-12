// Presupuesto mensual real -- una fila por usuario+año+mes, nunca se
// reescribe un mes pasado al cambiar el presupuesto del mes actual (ver
// UNIQUE(user_id, year, month) en la migración). Distinto de walletBalance
// (liquidez): esto es cuánto te propusiste gastar, no cuánto tienes.
export interface MonthlyBudget {
  year: number;
  month: number;
  amount: number;
  currency: string;
}
