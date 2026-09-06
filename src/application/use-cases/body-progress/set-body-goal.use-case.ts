import { BodyGoal } from '../../../domain/entities/body-goal.entity';
import { BodyGoalRepository } from '../../../domain/repositories/body-goal.repository';
import { DomainError } from '../../../domain/errors/domain.error';
import { SetBodyGoalDto } from '../../dtos/body-goal.dto';

// Crea una meta nueva y activa -- el repositorio se encarga de desactivar la
// anterior en la misma transacción (ver MysqlBodyGoalRepository.create), así
// que cambiar de meta nunca sobreescribe ni borra el historial.
export class SetBodyGoalUseCase {
  constructor(private readonly bodyGoalRepository: BodyGoalRepository) {}

  async execute(userId: string, dto: SetBodyGoalDto): Promise<BodyGoal> {
    if (dto.startWeightKg <= 0) {
      throw new DomainError('El peso inicial debe ser mayor a 0');
    }
    if ((dto.goalType === 'lose' || dto.goalType === 'gain') && !dto.targetWeightKg) {
      throw new DomainError('Los objetivos de bajar/subir de peso necesitan un peso meta');
    }
    if (dto.goalType === 'lose' && dto.targetWeightKg! >= dto.startWeightKg) {
      throw new DomainError('La meta debe ser menor al peso inicial para un objetivo de bajar de peso');
    }
    if (dto.goalType === 'gain' && dto.targetWeightKg! <= dto.startWeightKg) {
      throw new DomainError('La meta debe ser mayor al peso inicial para un objetivo de subir de peso');
    }

    return this.bodyGoalRepository.create(userId, {
      goalType: dto.goalType,
      startWeightKg: dto.startWeightKg,
      targetWeightKg: dto.targetWeightKg ?? null,
      startDate: dto.startDate,
      targetDate: dto.targetDate ?? null,
    });
  }
}
