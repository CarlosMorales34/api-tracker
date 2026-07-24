import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Global limiter for the whole API — mitigates general abuse/DDoS.
export const globalRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes, intenta más tarde.' },
});

// Stricter limiter for /api/auth/* — mitigates brute-force on login/register.
export const authRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos, intenta más tarde.' },
});
