export interface DebtPayment {
  id: string;
  weekStartDate: string;
  // Abono TOTAL (capital + interés). El capital real abonado a la deuda es
  // amount - interestAmount -- ver CreateDebtPaymentUseCase.
  amount: number;
  interestAmount: number;
}
