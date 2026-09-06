import { Router, RequestHandler } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { validateQuery } from '../middlewares/validate.middleware';
import { analyticsSummaryQuerySchema } from '../validators/analytics.validators';

export function analyticsRoutes(controller: AnalyticsController, authenticateMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/analytics/personal-summary:
   *   get:
   *     tags: [Analytics]
   *     summary: Resumen BI personal del usuario autenticado por rango de fechas
   *     security:
   *       - bearerAuth: []
   */
  router.get('/personal-summary', validateQuery(analyticsSummaryQuerySchema), controller.getPersonalSummary);

  return router;
}
