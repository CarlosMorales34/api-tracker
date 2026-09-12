import { CreditCard } from '../entities/credit-card.entity';
import { FinanceAdjustment } from '../entities/finance-adjustment.entity';

export interface CreditCardRepository {
  save(card: CreditCard): Promise<void>;
  // Solo name/creditLimit/dueDay -- corregir amountOwed pasa por
  // reconcileAmountOwed para dejar rastro auditable.
  update(card: CreditCard): Promise<void>;
  findById(id: string): Promise<CreditCard | null>;
  findAllByUserId(userId: string): Promise<CreditCard[]>;
  deleteById(id: string): Promise<void>;
  // Corrige "por pagar" dejando un FinanceAdjustment (target='credit_card')
  // con el saldo anterior/nuevo -- mismo criterio que reconcileWallet.
  reconcileAmountOwed(
    userId: string,
    cardId: string,
    newAmountOwed: number,
    reason: string | null,
  ): Promise<{ card: CreditCard; adjustment: FinanceAdjustment }>;
}
