import { NextFunction, Request, Response } from 'express';
import { ConflictError, NotFoundError, UnauthorizedError, DomainError } from '../../domain/errors/domain.error';
import { env } from '../../infrastructure/config/env';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof NotFoundError) {
    res.status(404).json({ message: error.message });
    return;
  }

  if (error instanceof ConflictError) {
    res.status(409).json({ message: error.message });
    return;
  }

  if (error instanceof UnauthorizedError) {
    res.status(401).json({ message: error.message });
    return;
  }

  if (error instanceof DomainError) {
    res.status(400).json({ message: error.message });
    return;
  }

  const isDev = env.nodeEnv !== 'production';
  const httpError = error as HttpError;
  // Non-domain errors that already carry an HTTP status (e.g. connect-timeout
  // raising 503) keep that status; everything else is a genuine 500.
  const status = httpError.status ?? httpError.statusCode ?? 500;

  if (isDev) {
    console.error(error);
  } else {
    console.error({ message: error.message, url: req.originalUrl, method: req.method, status });
  }

  // Never leak stack traces or internal error messages in production.
  const fallbackMessage = status === 503 ? 'Request timeout' : 'Internal server error';
  res.status(status).json({ message: isDev ? error.message : fallbackMessage });
}
