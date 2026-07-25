import { MoneyEntry, MoneyEntryType } from '../entities/money-entry.entity';

export interface MoneyEntryRepository {
  save(entry: MoneyEntry): Promise<void>;
  update(entry: MoneyEntry): Promise<void>;
  findById(id: string): Promise<MoneyEntry | null>;
  findByUserAndWeek(userId: string, weekStartDate: string): Promise<MoneyEntry[]>;
  deleteById(id: string): Promise<void>;
  // Usado por el resumen de Gastos diarios (monthIncome), reutilizando esta
  // misma tabla en vez de duplicar el dato en `expenses`.
  sumByUserTypeAndMonth(userId: string, type: MoneyEntryType, year: number, month: number): Promise<number>;
  // Usado por el resumen anual del Home ("Balance anual vs. años anteriores").
  sumByUserTypeAndYear(userId: string, type: MoneyEntryType, year: number): Promise<number>;
  // Años que tienen al menos un finance_entry -- para no mostrar años "en 0"
  // que en realidad nunca se registraron (distinto de un año con balance 0).
  findDistinctYearsWithEntries(userId: string): Promise<number[]>;
  // Años con al menos un ingreso -- Finanzas usa esto para saber qué años
  // del historial anual se calculan en vivo (suma de finance_entries) en vez
  // de depender de un total capturado a mano.
  findDistinctYearsWithIncome(userId: string): Promise<number[]>;
}
