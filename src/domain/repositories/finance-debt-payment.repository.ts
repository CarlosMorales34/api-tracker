import { DebtPayment } from '../entities/debt-payment.entity';

export interface FinanceDebtPaymentRepository {
  save(payment: DebtPayment & { userId: string }): Promise<void>;
  // Todas las semanas del usuario (debtPaid) vs. solo una semana (weekAbono).
  sumByUser(userId: string): Promise<number>;
  sumByUserAndWeek(userId: string, weekStartDate: string): Promise<number>;
}
