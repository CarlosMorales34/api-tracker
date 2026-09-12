import { CreditCard } from '../../../domain/entities/credit-card.entity';
import { CreditCardRepository } from '../../../domain/repositories/credit-card.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { UpdateCreditCardDto } from '../../dtos/update-credit-card.dto';

export class UpdateCreditCardUseCase {
  constructor(private readonly creditCardRepository: CreditCardRepository) {}

  async execute(userId: string, id: string, dto: UpdateCreditCardDto): Promise<CreditCard> {
    // amountOwed pasa por reconciliación (deja un FinanceAdjustment
    // auditable) en vez del UPDATE directo que usan name/creditLimit/dueDay.
    if (dto.amountOwed !== undefined) {
      const { card } = await this.creditCardRepository.reconcileAmountOwed(userId, id, dto.amountOwed, dto.reason ?? null);
      if (dto.name === undefined && dto.creditLimit === undefined && dto.dueDay === undefined) {
        return card;
      }
    }

    const card = await this.creditCardRepository.findById(id);
    if (!card || card.userId !== userId) {
      throw new NotFoundError('CreditCard', id);
    }

    card.applyUpdate({ name: dto.name, creditLimit: dto.creditLimit, dueDay: dto.dueDay });
    await this.creditCardRepository.update(card);
    return card;
  }
}
