import { Router } from 'express';
import { MetricController } from '../controllers/metric.controller';

export function metricRoutes(controller: MetricController): Router {
  const router = Router();
  router.post('/', controller.create);
  router.get('/', controller.list);
  return router;
}
