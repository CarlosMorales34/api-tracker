import { AnnualCounterRepository } from '../../../domain/repositories/annual-counter.repository';

export interface AnnualCounterView {
  id: string;
  name: string;
  year: number;
  value: number;
  previousYearValue: number | null;
}

export class ListAnnualCountersUseCase {
  constructor(private readonly annualCounterRepository: AnnualCounterRepository) {}

  async execute(userId: string, year: number): Promise<AnnualCounterView[]> {
    const counters = await this.annualCounterRepository.findAllByUserAndYear(userId, year);

    return Promise.all(
      counters.map(async (counter) => {
        const previous = await this.annualCounterRepository.findByUserNameAndYear(userId, counter.name, year - 1);
        return { ...counter.toJSON(), previousYearValue: previous?.value ?? null };
      }),
    );
  }
}
