import { Router } from 'express';
import { MetricEntryController } from '../controllers/metric-entry.controller';

export function metricEntryRoutes(controller: MetricEntryController): Router {
  const router = Router();
  router.post('/', controller.log);
  router.get('/:metricId', controller.history);
  return router;
}
