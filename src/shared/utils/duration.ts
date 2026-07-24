type DurationUnit = 's' | 'm' | 'h' | 'd';

const UNIT_TO_MS: Record<DurationUnit, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Parses simple duration strings like "15m", "7d", "30s" (same format used by
// JWT_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN) into milliseconds, for use as
// cookie maxAge. Falls back to treating a bare number as seconds, matching
// jsonwebtoken's own convention for numeric `expiresIn`.
export function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(value.trim());
  if (match?.[1] && match[2]) {
    const amount = match[1];
    const unit = match[2].toLowerCase() as DurationUnit;
    return Number(amount) * UNIT_TO_MS[unit];
  }

  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) {
    return asNumber * 1000;
  }

  throw new Error(`Invalid duration string: "${value}"`);
}
