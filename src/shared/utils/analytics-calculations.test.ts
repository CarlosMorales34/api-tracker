import { describe, expect, it } from 'vitest';
import { clockDistanceMinutes, durationHours, formatMinutesAsTime, parseTimeToMinutes } from './analytics-calculations';

describe('analytics-calculations', () => {
  it('calculates early-morning ranges without treating midnight as empty', () => {
    expect(durationHours('00:00', '06:00')).toBe(6);
  });

  it('calculates ordinary same-day ranges', () => {
    expect(durationHours('09:30', '15:00')).toBe(5.5);
  });

  it('calculates ranges that cross midnight when explicitly allowed', () => {
    expect(durationHours('23:00', '07:00', { allowCrossMidnight: true })).toBe(8);
  });

  it('keeps invalid same-day reverse ranges at zero unless crossing midnight is allowed', () => {
    expect(durationHours('23:00', '07:00')).toBe(0);
  });

  it('round-trips minutes to display time', () => {
    expect(formatMinutesAsTime(parseTimeToMinutes('07:15'))).toBe('07:15');
  });

  it('measures clock distance across midnight as nearby time', () => {
    expect(clockDistanceMinutes(parseTimeToMinutes('23:00'), parseTimeToMinutes('00:00'))).toBe(60);
  });
});
