import { randomUUID } from 'node:crypto';
import { DebtPayment } from '../../../domain/entities/debt-payment.entity';
import { FinanceDebtPaymentRepository } from '../../../domain/repositories/finance-debt-payment.repository';
import { DomainError } from '../../../domain/errors/domain.error';
import { CreateDebtPaymentDto } from '../../dtos/create-debt-payment.dto';

// Registrar un abono baja liquidez y deuda EN LA MISMA operación (antes solo
// insertaba la fila, sin tocar ningún otro número -- ver
// MysqlFinanceDebtPaymentRepository.recordPayment para la transacción real).
// El interés no baja deuda -- solo el capital (amount - interestAmount) lo
// hace, y el interés se suma como gasto de esa semana en el resumen.
export class CreateDebtPaymentUseCase {
  constructor(private readonly debtPaymentRepository: FinanceDebtPaymentRepository) {}

  async execute(userId: string, dto: CreateDebtPaymentDto): Promise<DebtPayment> {
    const interestAmount = dto.interestAmount ?? 0;
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new DomainError('El abono debe ser un monto positivo');
    }
    if (!Number.isFinite(interestAmount) || interestAmount < 0 || interestAmount > dto.amount) {
      throw new DomainError('El interés debe ser un monto entre 0 y el total del abono');
    }

    const payment: DebtPayment = {
      id: randomUUID(),
      weekStartDate: dto.weekStartDate,
      amount: dto.amount,
      interestAmount,
    };
    const principalAmount = Math.round((dto.amount - interestAmount) * 100) / 100;

    await this.debtPaymentRepository.recordPayment({ ...payment, userId }, -dto.amount, principalAmount);
    return payment;
  }
}
