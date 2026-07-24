import { AnnualCounterRepository } from '../../../domain/repositories/annual-counter.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteAnnualCounterUseCase {
  constructor(private readonly annualCounterRepository: AnnualCounterRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const counter = await this.annualCounterRepository.findById(id);
    if (!counter || counter.userId !== userId) {
      throw new NotFoundError('AnnualCounter', id);
    }

    await this.annualCounterRepository.deleteById(id);
  }
}
