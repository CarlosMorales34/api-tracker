import { Response } from 'express';
import { env } from '../../infrastructure/config/env';
import { parseDurationMs } from '../../shared/utils/duration';

const REFRESH_COOKIE_NAME = 'refresh_token';
// Scoped to /api/auth so the cookie isn't sent on every API request — only on
// refresh/logout, which are the only endpoints that need it.
const REFRESH_COOKIE_PATH = '/api/auth';

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.nodeEnv === 'production',
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...baseCookieOptions(),
    maxAge: parseDurationMs(env.jwt.refreshExpiresIn),
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}

export { REFRESH_COOKIE_NAME };
