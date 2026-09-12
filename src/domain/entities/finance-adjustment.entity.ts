export type FinanceAdjustmentTarget = 'wallet' | 'credit_card';

// Rastro auditable de una corrección manual (conciliar cartera, corregir
// "por pagar" de una tarjeta) -- reemplaza el sobrescribir directo sin
// dejar evidencia. El valor final aplicado es el mismo de antes, pero ahora
// queda "de cuánto a cuánto, y por qué".
export interface FinanceAdjustment {
  id: string;
  target: FinanceAdjustmentTarget;
  targetId: string | null;
  previousAmount: number;
  newAmount: number;
  difference: number;
  reason: string | null;
  createdAt: Date;
}
