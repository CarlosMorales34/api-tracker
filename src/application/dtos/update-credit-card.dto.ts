export interface UpdateCreditCardDto {
  name?: string;
  creditLimit?: number;
  dueDay?: number;
  // Si viene, se aplica vía reconciliación (deja un FinanceAdjustment
  // auditable) en vez de sobrescribir directo -- ver UpdateCreditCardUseCase.
  amountOwed?: number;
  reason?: string | null;
}
