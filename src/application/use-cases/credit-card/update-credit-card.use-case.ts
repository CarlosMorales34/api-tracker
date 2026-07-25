import { CreditCard } from '../../../domain/entities/credit-card.entity';
import { CreditCardRepository } from '../../../domain/repositories/credit-card.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { UpdateCreditCardDto } from '../../dtos/update-credit-card.dto';

export class UpdateCreditCardUseCase {
  constructor(private readonly creditCardRepository: CreditCardRepository) {}

  async execute(userId: string, id: string, dto: UpdateCreditCardDto): Promise<CreditCard> {
    const card = await this.creditCardRepository.findById(id);
    if (!card || card.userId !== userId) {
      throw new NotFoundError('CreditCard', id);
    }

    card.applyUpdate(dto);
    await this.creditCardRepository.update(card);
    return card;
  }
}
