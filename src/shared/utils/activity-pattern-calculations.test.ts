import { describe, expect, it } from 'vitest';
import {
  averageAbsoluteDeviation,
  blendMinutesWithCorrections,
  buildScheduleEstimate,
  computeConfidence,
  detectWeekdayFrequency,
  formatMinutesAsHHMM,
  hasMinimumEvidence,
  median,
  meetsShowThreshold,
  ManualTimeSample,
  parseHHMMToMinutes,
  resolveDurationMinutes,
} from './activity-pattern-calculations';

function sample(overrides: Partial<ManualTimeSample>): ManualTimeSample {
  return {
    weekday: 1,
    weekKey: '2026-01-03',
    startMinutes: 540, // 09:00
    endMinutes: 1050, // 17:30
    daysAgo: 3,
    ...overrides,
  };
}

describe('resolveDurationMinutes', () => {
  it('calcula la duración normal dentro del mismo día', () => {
    expect(resolveDurationMinutes(540, 1050)).toBe(510); // 09:00-17:30 = 8h30
  });

  it('maneja actividades que cruzan medianoche (Dormir 23:00-07:00)', () => {
    expect(resolveDurationMinutes(23 * 60, 7 * 60)).toBe(480); // 8 horas
  });

  it('duración cero cuando inicio y fin son iguales', () => {
    expect(resolveDurationMinutes(600, 600)).toBe(0);
  });
});

describe('median', () => {
  it('calcula la mediana de un conjunto impar', () => {
    expect(median([540, 550, 560])).toBe(550);
  });

  it('calcula la mediana de un conjunto par como promedio de los dos centrales', () => {
    expect(median([540, 550, 560, 570])).toBe(555);
  });

  it('lanza si no hay valores', () => {
    expect(() => median([])).toThrow();
  });
});

describe('averageAbsoluteDeviation', () => {
  it('es 0 cuando todos los valores son iguales (horario perfectamente consistente)', () => {
    expect(averageAbsoluteDeviation([540, 540, 540])).toBe(0);
  });

  it('crece con la dispersión real de los valores', () => {
    const low = averageAbsoluteDeviation([540, 545, 535]);
    const high = averageAbsoluteDeviation([480, 600, 540]);
    expect(high).toBeGreaterThan(low);
  });
});

describe('detectWeekdayFrequency', () => {
  it('detecta días frecuentes y calcula distinctWeeks y matchRatio correctamente', () => {
    const samples: ManualTimeSample[] = [
      sample({ weekday: 1, weekKey: 'w1' }),
      sample({ weekday: 1, weekKey: 'w2' }),
      sample({ weekday: 1, weekKey: 'w3' }),
      sample({ weekday: 2, weekKey: 'w1' }), // otro día, no debe mezclarse con weekday 1
    ];
    const result = detectWeekdayFrequency(samples, 6);

    const monday = result.find((r) => r.weekday === 1)!;
    expect(monday.sampleCount).toBe(3);
    expect(monday.distinctWeeks).toBe(3);
    expect(monday.matchRatio).toBeCloseTo(3 / 6);

    const tuesday = result.find((r) => r.weekday === 2)!;
    expect(tuesday.sampleCount).toBe(1);
    expect(tuesday.distinctWeeks).toBe(1);
  });

  it('no duplica semanas si hay más de un registro el mismo día en la misma semana', () => {
    const samples: ManualTimeSample[] = [
      sample({ weekday: 1, weekKey: 'w1', startMinutes: 540, endMinutes: 600 }),
      sample({ weekday: 1, weekKey: 'w1', startMinutes: 700, endMinutes: 800 }), // mismo día/semana, otro bloque
    ];
    const result = detectWeekdayFrequency(samples, 4);
    expect(result[0]!.sampleCount).toBe(2);
    expect(result[0]!.distinctWeeks).toBe(1); // sigue siendo 1 semana distinta
  });

  it('ordena de mayor a menor matchRatio', () => {
    const samples: ManualTimeSample[] = [
      sample({ weekday: 3, weekKey: 'a' }),
      sample({ weekday: 1, weekKey: 'a' }),
      sample({ weekday: 1, weekKey: 'b' }),
      sample({ weekday: 1, weekKey: 'c' }),
    ];
    const result = detectWeekdayFrequency(samples, 8);
    expect(result[0]!.weekday).toBe(1);
  });
});

describe('buildScheduleEstimate', () => {
  it('calcula mediana de horario típico (ej. Trabajo 09:00-17:30)', () => {
    const samples: ManualTimeSample[] = [
      sample({ startMinutes: 540, endMinutes: 1050 }),
      sample({ startMinutes: 540, endMinutes: 1050 }),
      sample({ startMinutes: 540, endMinutes: 1050 }),
    ];
    const estimate = buildScheduleEstimate(samples);
    expect(estimate.medianStartMinutes).toBe(540);
    expect(estimate.medianDurationMinutes).toBe(510);
    expect(estimate.medianEndMinutes).toBe(1050);
    expect(estimate.crossesMidnight).toBe(false);
  });

  it('calcula mediana de duración correctamente para actividades que cruzan medianoche', () => {
    // "Dormir" todos los días 23:00-07:00 -> duración 480 min cada vez
    const samples: ManualTimeSample[] = [
      sample({ startMinutes: 23 * 60, endMinutes: 7 * 60 }),
      sample({ startMinutes: 23 * 60, endMinutes: 7 * 60 }),
      sample({ startMinutes: 23 * 60, endMinutes: 7 * 60 }),
    ];
    const estimate = buildScheduleEstimate(samples);
    expect(estimate.medianDurationMinutes).toBe(480);
    expect(estimate.crossesMidnight).toBe(true);
    // El fin mediano (23:00 + 480min = 07:00 del día siguiente) debe volver a
    // caer en minuto 420 tras el módulo 1440, no quedar en un número > 1440.
    expect(estimate.medianEndMinutes).toBe(7 * 60);
  });

  it('lanza si no hay muestras', () => {
    expect(() => buildScheduleEstimate([])).toThrow();
  });

  it('no infla la dispersión cuando el inicio cruza medianoche entre muestras (Dormir 23:00 casi siempre, 00:00 algunas veces)', () => {
    // Caso real: mayoría a las 23:00, algunas a las 23:30, un par ya pasada
    // la medianoche (00:00, 00:30) -- en minutos-del-día crudos estas
    // últimas están a ~23h de distancia de 23:00, pero en la vida real son
    // solo 1h después. La dispersión debe reflejar esa cercanía real.
    const samples: ManualTimeSample[] = [
      sample({ startMinutes: 23 * 60, endMinutes: 7 * 60 }),
      sample({ startMinutes: 23 * 60, endMinutes: 7 * 60 }),
      sample({ startMinutes: 23 * 60, endMinutes: 7 * 60 }),
      sample({ startMinutes: 23 * 60 + 30, endMinutes: 7 * 60 + 30 }),
      sample({ startMinutes: 0, endMinutes: 8 * 60 }), // 00:00 -- "cruzó" al día siguiente
      sample({ startMinutes: 30, endMinutes: 8 * 60 + 30 }), // 00:30
    ];
    const estimate = buildScheduleEstimate(samples);
    // La dispersión real es de ~1h (60 min), no de ~11-12h como daría un
    // cálculo lineal ingenuo sobre minutos-del-día crudos.
    expect(estimate.startDispersionMinutes).toBeLessThan(60);
    // La mediana de inicio debe caer cerca de 23:00-23:30, no a mediodía.
    expect(estimate.medianStartMinutes).toBeGreaterThan(22 * 60);
  });
});

describe('hasMinimumEvidence / meetsShowThreshold', () => {
  it('rechaza con menos del mínimo de muestras (MIN_SAMPLE_COUNT=4)', () => {
    expect(hasMinimumEvidence(3, 3)).toBe(false);
    expect(hasMinimumEvidence(4, 3)).toBe(true);
  });

  it('rechaza con menos del mínimo de semanas distintas (MIN_DISTINCT_WEEKS=3)', () => {
    expect(hasMinimumEvidence(10, 2)).toBe(false);
    expect(hasMinimumEvidence(10, 3)).toBe(true);
  });

  it('una confianza justo debajo del umbral no se muestra', () => {
    expect(meetsShowThreshold(0.69)).toBe(false);
    expect(meetsShowThreshold(0.7)).toBe(true);
  });
});

describe('computeConfidence', () => {
  const strongEvidence = {
    sampleCount: 18,
    distinctWeeks: 6,
    scheduleDispersionMinutes: 0,
    daysSinceLastSample: 0,
    recentDismissalsForSimilar: 0,
    recentAcceptancesForSimilar: 0,
  };

  it('confianza alta con muchas muestras, semanas y horario consistente', () => {
    expect(computeConfidence(strongEvidence)).toBeGreaterThanOrEqual(0.9);
  });

  it('la confianza baja cuando hay pocos registros', () => {
    const weak = computeConfidence({ ...strongEvidence, sampleCount: 4, distinctWeeks: 3 });
    const strong = computeConfidence(strongEvidence);
    expect(weak).toBeLessThan(strong);
  });

  it('la confianza baja cuando el horario varía demasiado', () => {
    const dispersed = computeConfidence({ ...strongEvidence, scheduleDispersionMinutes: 90 });
    expect(dispersed).toBeLessThan(computeConfidence(strongEvidence));
  });

  it('la confianza baja cuando el patrón es antiguo (sin repetirse recientemente)', () => {
    const stale = computeConfidence({ ...strongEvidence, daysSinceLastSample: 30 });
    expect(stale).toBeLessThan(computeConfidence(strongEvidence));
  });

  it('la confianza baja cuando el usuario descartó sugerencias similares', () => {
    const dismissed = computeConfidence({ ...strongEvidence, recentDismissalsForSimilar: 2 });
    expect(dismissed).toBeLessThan(computeConfidence(strongEvidence));
  });

  it('la confianza sube cuando el usuario aceptó sugerencias similares', () => {
    // Base moderada (no en el techo de 1.0) para que el boost sea observable
    // -- con strongEvidence la confianza ya satura en 1.0 y no hay margen.
    const moderate = { ...strongEvidence, sampleCount: 5, distinctWeeks: 3 };
    const accepted = computeConfidence({ ...moderate, recentAcceptancesForSimilar: 2 });
    expect(accepted).toBeGreaterThan(computeConfidence(moderate));
  });

  it('nunca excede 1 ni baja de 0', () => {
    const maxed = computeConfidence({ ...strongEvidence, recentAcceptancesForSimilar: 50 });
    expect(maxed).toBeLessThanOrEqual(1);
    const minned = computeConfidence({ ...strongEvidence, recentDismissalsForSimilar: 50 });
    expect(minned).toBeGreaterThanOrEqual(0);
  });
});

describe('blendMinutesWithCorrections', () => {
  it('sin correcciones, devuelve el patrón original', () => {
    expect(blendMinutesWithCorrections(540, [])).toBe(540);
  });

  it('converge gradualmente hacia correcciones repetidas (no salta de golpe)', () => {
    // Sistema sugería 09:00 (540), usuario corrige repetidamente a 09:30 (570)
    const afterOne = blendMinutesWithCorrections(540, [570]);
    const afterThree = blendMinutesWithCorrections(540, [570, 570, 570]);

    // Una sola corrección mueve poco el resultado.
    expect(afterOne).toBeGreaterThan(540);
    expect(afterOne).toBeLessThan(570);
    // Varias correcciones consistentes acercan más el resultado a 570 que una sola.
    expect(afterThree).toBeGreaterThan(afterOne);
    expect(afterThree).toBeLessThanOrEqual(570);
  });
});

describe('parseHHMMToMinutes', () => {
  it('convierte HH:MM a minutos desde medianoche', () => {
    expect(parseHHMMToMinutes('09:00')).toBe(540);
    expect(parseHHMMToMinutes('00:00')).toBe(0);
    expect(parseHHMMToMinutes('23:59')).toBe(1439);
  });
});

describe('formatMinutesAsHHMM', () => {
  it('formatea minutos normales', () => {
    expect(formatMinutesAsHHMM(540)).toBe('09:00');
  });

  it('normaliza minutos fuera de rango (después de sumar duración cruzando medianoche)', () => {
    expect(formatMinutesAsHHMM(1500)).toBe('01:00'); // 1500 - 1440
  });
});
