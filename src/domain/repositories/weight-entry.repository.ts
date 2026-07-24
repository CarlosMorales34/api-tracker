import { WeightGoalDirection } from '../entities/weight-settings.entity';
import { WeightEntry } from '../entities/weight-entry.entity';

export interface WeightBestEver {
  value: number;
  year: number;
  month: number;
}

export interface WeightEntryRepository {
  // Conserva `note` existente (UPSERT que solo toca la columna value).
  upsertValue(userId: string, year: number, month: number, value: number | null): Promise<void>;
  // Conserva `value` existente (UPSERT que solo toca la columna note).
  upsertNote(userId: string, year: number, month: number, note: string): Promise<void>;
  findByUserYearMonth(userId: string, year: number, month: number): Promise<WeightEntry | null>;
  findAllByUserAndYear(userId: string, year: number): Promise<WeightEntry[]>;
  // direction determina si "mejor" es el valor más bajo ('lose') o más alto ('gain').
  findBestEver(userId: string, direction: WeightGoalDirection): Promise<WeightBestEver | null>;
  // Todas las entradas del usuario con value no-null, cualquier año -- para
  // calcular mejor/peor por año (ver get-weight-yearly-extremes.use-case.ts).
  findAllWithValue(userId: string): Promise<WeightEntry[]>;
}
