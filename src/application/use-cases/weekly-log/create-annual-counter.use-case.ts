import { randomUUID } from 'node:crypto';
import { AnnualCounter } from '../../../domain/entities/annual-counter.entity';
import { AnnualCounterRepository } from '../../../domain/repositories/annual-counter.repository';
import { CreateAnnualCounterDto } from '../../dtos/create-annual-counter.dto';

export class CreateAnnualCounterUseCase {
  constructor(private readonly annualCounterRepository: AnnualCounterRepository) {}

  async execute(userId: string, dto: CreateAnnualCounterDto): Promise<AnnualCounter> {
    const counter = AnnualCounter.create({ id: randomUUID(), userId, name: dto.name, year: dto.year, value: dto.value });
    await this.annualCounterRepository.save(counter);
    return counter;
  }
}
