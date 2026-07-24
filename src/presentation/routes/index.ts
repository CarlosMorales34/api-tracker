import { Router } from 'express';
import { MetricController } from '../controllers/metric.controller';
import { MetricEntryController } from '../controllers/metric-entry.controller';
import { metricRoutes } from './metric.routes';
import { metricEntryRoutes } from './metric-entry.routes';

export function apiRoutes(metricController: MetricController, metricEntryController: MetricEntryController): Router {
  const router = Router();
  router.use('/metrics', metricRoutes(metricController));
  router.use('/metric-entries', metricEntryRoutes(metricEntryController));
  return router;
}
