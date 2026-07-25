import { CreditCardRepository } from '../../../domain/repositories/credit-card.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteCreditCardUseCase {
  constructor(private readonly creditCardRepository: CreditCardRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const card = await this.creditCardRepository.findById(id);
    if (!card || card.userId !== userId) {
      throw new NotFoundError('CreditCard', id);
    }

    await this.creditCardRepository.deleteById(id);
  }
}
