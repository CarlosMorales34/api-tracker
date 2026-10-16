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
  if (options.allowCrossMidnight && endMinutes < startMinutes) {
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

export function intervalUnionHours(intervals: { startTime: string; endTime: string }[]): number {
  const ranges = intervals.map(({ startTime, endTime }) => {
    const start = parseTimeToMinutes(startTime);
    const end = parseTimeToMinutes(endTime);
    return [start, end < start ? end + 1440 : end] as const;
  }).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let end = -1;
  for (const [start, nextEnd] of ranges) {
    total += Math.max(0, nextEnd - Math.max(start, end));
    end = Math.max(end, nextEnd);
  }
  return round2(total / 60);
}

export function principalSleepEntries<T extends { logDate: string; startTime: string; endTime: string }>(entries: T[]): T[] {
  const byDate = new Map<string, T>();
  for (const entry of entries) {
    const hours = durationHours(entry.startTime, entry.endTime, { allowCrossMidnight: true });
    if (hours <= 0) continue;
    const previous = byDate.get(entry.logDate);
    if (!previous || hours > durationHours(previous.startTime, previous.endTime, { allowCrossMidnight: true })) {
      byDate.set(entry.logDate, entry);
    }
  }
  return [...byDate.values()];
}
