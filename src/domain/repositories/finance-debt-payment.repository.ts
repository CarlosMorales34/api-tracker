import { DebtPayment } from '../entities/debt-payment.entity';

export interface FinanceDebtPaymentRepository {
  // Registra el pago Y aplica sus consecuencias (bajar cartera por el total,
  // bajar deuda por el capital, sin dejarla negativa) en una sola
  // transacción -- nunca deuda y liquidez desincronizadas si algo falla a
  // la mitad. walletDelta ya viene negativo; principalAmount es positivo
  // (amount - interestAmount).
  recordPayment(payment: DebtPayment & { userId: string }, walletDelta: number, principalAmount: number): Promise<void>;
  // Todas las semanas del usuario (debtPaid) vs. solo una semana (weekAbono).
  sumByUser(userId: string): Promise<number>;
  sumByUserAndWeek(userId: string, weekStartDate: string): Promise<number>;
  // Suma de interestAmount de la semana -- se refleja como gasto adicional
  // en el resumen semanal sin tocar daily_expenses.
  sumInterestByUserAndWeek(userId: string, weekStartDate: string): Promise<number>;
  // Mismo interés, pero por rango de fechas (YYYY-MM-DD inclusive) -- usado
  // por GetSavingsSummaryUseCase para que "ahorro = ingresos - gastos
  // reales" también cuente el interés como gasto (regla explícita: el
  // capital abonado no es gasto, el interés sí).
  sumInterestByUserAndDateRange(userId: string, from: string, to: string): Promise<number>;
}
