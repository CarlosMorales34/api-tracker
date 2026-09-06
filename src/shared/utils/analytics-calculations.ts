export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function formatMinutesAsTime(value: number): string {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function durationHours(start: string, end: string, options: { allowCrossMidnight?: boolean } = {}): number {
  const startMinutes = parseTimeToMinutes(start);
  let endMinutes = parseTimeToMinutes(end);
  if (options.allowCrossMidnight && endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  if (endMinutes <= startMinutes) return 0;
  return round2((endMinutes - startMinutes) / 60);
}

export function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function average(values: number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

export function averageAbsoluteDeviation(values: number[], center: number): number | null {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return null;
  return average(clean.map((value) => Math.abs(value - center)));
}

export function clockDistanceMinutes(a: number, b: number): number {
  const diff = Math.abs((((a - b) % 1440) + 1440) % 1440);
  return Math.min(diff, 1440 - diff);
}

export function averageClockDeviation(values: number[], center: number): number | null {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return null;
  return average(clean.map((value) => clockDistanceMinutes(value, center)));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}
