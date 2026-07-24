function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  port: Number(required('PORT', '4000')),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    host: required('DB_HOST', 'localhost'),
    port: Number(required('DB_PORT', '3306')),
    user: required('DB_USER', 'vitalis'),
    password: required('DB_PASSWORD', 'vitalis'),
    database: required('DB_NAME', 'vitalis'),
    poolLimit: optionalNumber('DB_POOL_LIMIT', 10),
  },
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: required('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: required('JWT_REFRESH_EXPIRES_IN', '7d'),
  },
  corsOrigin: required('CORS_ORIGIN', 'http://localhost:3000'),
};
