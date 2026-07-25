import { randomUUID } from 'node:crypto';
import { CreditCard } from '../../../domain/entities/credit-card.entity';
import { CreditCardRepository } from '../../../domain/repositories/credit-card.repository';
import { CreateCreditCardDto } from '../../dtos/create-credit-card.dto';

export class CreateCreditCardUseCase {
  constructor(private readonly creditCardRepository: CreditCardRepository) {}

  async execute(userId: string, dto: CreateCreditCardDto): Promise<CreditCard> {
    const card = CreditCard.create({
      id: randomUUID(),
      userId,
      name: dto.name,
      creditLimit: dto.creditLimit,
      dueDay: dto.dueDay,
      amountOwed: dto.amountOwed ?? 0,
    });

    await this.creditCardRepository.save(card);
    return card;
  }
}
