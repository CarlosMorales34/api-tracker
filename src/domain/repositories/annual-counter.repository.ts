import { AnnualCounter } from '../entities/annual-counter.entity';

export interface AnnualCounterRepository {
  save(counter: AnnualCounter): Promise<void>;
  findById(id: string): Promise<AnnualCounter | null>;
  findAllByUserAndYear(userId: string, year: number): Promise<AnnualCounter[]>;
  findByUserNameAndYear(userId: string, name: string, year: number): Promise<AnnualCounter | null>;
  deleteById(id: string): Promise<void>;
}
