import { CreditCard } from '../../../domain/entities/credit-card.entity';
import { CreditCardRepository } from '../../../domain/repositories/credit-card.repository';

export class ListCreditCardsUseCase {
  constructor(private readonly creditCardRepository: CreditCardRepository) {}

  async execute(userId: string): Promise<CreditCard[]> {
    return this.creditCardRepository.findAllByUserId(userId);
  }
}
