import { describe, expect, it } from 'vitest';
import { normalizeExerciseName } from './exercise-name';

describe('exercise identity keys', () => {
  it('matches cosmetic differences without merging distinct variants', () => {
    expect(normalizeExerciseName('  Elevación   LATERAL ')).toBe(normalizeExerciseName('elevacion lateral'));
    expect(normalizeExerciseName('Curl martillo')).not.toBe(normalizeExerciseName('Curl martillo unilateral'));
    expect(normalizeExerciseName('Martillos')).not.toBe(normalizeExerciseName('Curl martillo'));
  });
});
