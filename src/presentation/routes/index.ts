import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { MetricController } from '../controllers/metric.controller';
import { MetricEntryController } from '../controllers/metric-entry.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { authRateLimiter } from '../middlewares/rate-limiters.middleware';
import { authRoutes } from './auth.routes';
import { metricRoutes } from './metric.routes';
import { metricEntryRoutes } from './metric-entry.routes';

export interface ApiRoutesDeps {
  authController: AuthController;
  metricController: MetricController;
  metricEntryController: MetricEntryController;
  authenticateMiddleware: RequestHandler;
  idempotencyRepository: IdempotencyRepository;
}

export function apiRoutes(deps: ApiRoutesDeps): Router {
  const router = Router();

  router.use('/auth', authRateLimiter, authRoutes(deps.authController, deps.idempotencyRepository));
  router.use('/metrics', metricRoutes(deps.metricController, deps.authenticateMiddleware, deps.idempotencyRepository));
  router.use(
    '/metric-entries',
    metricEntryRoutes(deps.metricEntryController, deps.authenticateMiddleware, deps.idempotencyRepository),
  );

  return router;
}
