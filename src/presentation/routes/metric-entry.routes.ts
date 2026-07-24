import { Router, RequestHandler } from 'express';
import { MetricEntryController } from '../controllers/metric-entry.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { logMetricEntrySchema } from '../validators/metric-entry.validators';

const LOG_ENTRY_ROUTE = 'metric-entries:create';

/**
 * @openapi
 * components:
 *   schemas:
 *     MetricEntry:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         metricId: { type: string, format: uuid }
 *         value: { type: number }
 *         recordedAt: { type: string, format: date-time }
 *         note: { type: string }
 */
export function metricEntryRoutes(
  controller: MetricEntryController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/metric-entries:
   *   post:
   *     tags: [Metric Entries]
   *     summary: Registrar una medición para una métrica propia del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: false
   *         schema: { type: string }
   *         description: Si se envía, reintentos con la misma key y el mismo body devuelven la misma respuesta sin duplicar la medición.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [metricId, value]
   *             properties:
   *               metricId: { type: string, format: uuid }
   *               value: { type: number }
   *               recordedAt: { type: string, format: date-time }
   *               note: { type: string, maxLength: 280 }
   *     responses:
   *       201:
   *         description: Medición registrada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/MetricEntry' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: metricId no existe o no pertenece al usuario autenticado
   */
  router.post(
    '/',
    idempotency(idempotencyRepository, LOG_ENTRY_ROUTE),
    validateBody(logMetricEntrySchema),
    controller.log,
  );

  /**
   * @openapi
   * /api/metric-entries/{metricId}:
   *   get:
   *     tags: [Metric Entries]
   *     summary: Historial de mediciones de una métrica propia del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: metricId
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Historial de mediciones
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/MetricEntry' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: metricId no existe o no pertenece al usuario autenticado
   */
  router.get('/:metricId', controller.history);

  return router;
}
