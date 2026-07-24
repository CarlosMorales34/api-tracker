import { WeightEntryRepository } from '../../../domain/repositories/weight-entry.repository';
import { WeightSettingsRepository } from '../../../domain/repositories/weight-settings.repository';
import { DEFAULT_WEIGHT_SETTINGS } from '../../../domain/entities/weight-settings.entity';

export interface WeightYearExtreme {
  year: number;
  bestMonth: number;
  bestValue: number;
  worstMonth: number;
  worstValue: number;
}

// Mejor/peor mes de cada año -- solo entre los meses que SÍ tienen dato
// (años incompletos son normales: alguien no se pesó todos los meses). Un
// año con un solo mes registrado tiene bestMonth === worstMonth, es el
// reflejo honesto de un dato incompleto, no un caso a esconder.
export class GetWeightYearlyExtremesUseCase {
  constructor(
    private readonly weightEntryRepository: WeightEntryRepository,
    private readonly weightSettingsRepository: WeightSettingsRepository,
  ) {}

  async execute(userId: string): Promise<WeightYearExtreme[]> {
    const [entries, settings] = await Promise.all([
      this.weightEntryRepository.findAllWithValue(userId),
      this.weightSettingsRepository.find(userId),
    ]);

    const direction = (settings ?? DEFAULT_WEIGHT_SETTINGS).goalDirection;

    const byYear = new Map<number, { month: number; value: number }[]>();
    for (const entry of entries) {
      if (entry.value === null) continue;
      const list = byYear.get(entry.year) ?? [];
      list.push({ month: entry.month, value: entry.value });
      byYear.set(entry.year, list);
    }

    const results: WeightYearExtreme[] = [];
    for (const [year, months] of byYear) {
      let min = months[0]!;
      let max = months[0]!;
      for (const m of months) {
        if (m.value < min.value) min = m;
        if (m.value > max.value) max = m;
      }

      const best = direction === 'gain' ? max : min;
      const worst = direction === 'gain' ? min : max;

      results.push({ year, bestMonth: best.month, bestValue: best.value, worstMonth: worst.month, worstValue: worst.value });
    }

    return results.sort((a, b) => a.year - b.year);
  }
}
