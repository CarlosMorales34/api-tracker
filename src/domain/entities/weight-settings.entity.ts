export type WeightGoalDirection = 'lose' | 'gain';

export interface WeightSettings {
  goalKg: number;
  // 'lose' = "mejor" es el valor más bajo del período; 'gain' = "mejor" es
  // el más alto. Sin esto no hay forma correcta de calcular "mejor
  // histórico" para alguien que busca subir de peso.
  goalDirection: WeightGoalDirection;
}

export const DEFAULT_WEIGHT_SETTINGS: WeightSettings = { goalKg: 60, goalDirection: 'lose' };
