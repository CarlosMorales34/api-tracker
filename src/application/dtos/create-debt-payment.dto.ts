export interface CreateDebtPaymentDto {
  weekStartDate: string;
  // Abono TOTAL (capital + interés).
  amount: number;
  // Interés incluido en amount -- default 0 (comportamiento actual: todo el
  // abono baja deuda). El capital real es amount - interestAmount.
  interestAmount?: number;
}
