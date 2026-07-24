import { createHash } from 'node:crypto';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';

// Idempotency middleware for POST endpoints. If the client sends an
// `Idempotency-Key` header:
//   - unseen key -> lets the request through, then persists the response
//     (status + body) after the controller answers, keyed by (key, route).
//   - seen key + same body hash -> replays the stored response without
//     re-running the use case.
//   - seen key + different body hash -> 409 Conflict (key reused with a
//     different payload).
// No header -> normal behavior, untouched.
//
// Depends only on the IdempotencyRepository abstraction (no direct SQL here),
// respecting the Clean Architecture dependency rule.
export function idempotency(repository: IdempotencyRepository, route: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.header('Idempotency-Key');
    if (!key) {
      next();
      return;
    }

    const requestHash = hashBody(req.body);
    const existing = await repository.findByKeyAndRoute(key, route);

    if (existing) {
      if (existing.requestHash !== requestHash) {
        res.status(409).json({ message: 'Idempotency-Key ya fue usada con un payload distinto' });
        return;
      }
      res.status(existing.responseStatus).json(existing.responseBody);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      repository
        .save({
          idempotencyKey: key,
          route,
          userId: req.user?.id ?? null,
          requestHash,
          responseStatus: res.statusCode,
          responseBody: body,
        })
        .catch((error) => console.error('idempotency: failed to persist response', error));
      return originalJson(body);
    }) as Response['json'];

    next();
  };
}

function hashBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}
