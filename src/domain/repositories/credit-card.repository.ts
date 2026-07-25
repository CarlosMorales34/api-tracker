import { CreditCard } from '../entities/credit-card.entity';

export interface CreditCardRepository {
  save(card: CreditCard): Promise<void>;
  update(card: CreditCard): Promise<void>;
  findById(id: string): Promise<CreditCard | null>;
  findAllByUserId(userId: string): Promise<CreditCard[]>;
  deleteById(id: string): Promise<void>;
}
