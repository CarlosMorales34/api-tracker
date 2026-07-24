import { randomUUID } from 'node:crypto';
import { DebtPayment } from '../../../domain/entities/debt-payment.entity';
import { FinanceDebtPaymentRepository } from '../../../domain/repositories/finance-debt-payment.repository';
import { CreateDebtPaymentDto } from '../../dtos/create-debt-payment.dto';

export class CreateDebtPaymentUseCase {
  constructor(private readonly debtPaymentRepository: FinanceDebtPaymentRepository) {}

  async execute(userId: string, dto: CreateDebtPaymentDto): Promise<DebtPayment> {
    const payment: DebtPayment = { id: randomUUID(), weekStartDate: dto.weekStartDate, amount: dto.amount };
    await this.debtPaymentRepository.save({ ...payment, userId });
    return payment;
  }
}
