import { Router, RequestHandler } from 'express';
import { MetricController } from '../controllers/metric.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createMetricSchema } from '../validators/metric.validators';

const CREATE_METRIC_ROUTE = 'metrics:create';

/**
 * @openapi
 * components:
 *   schemas:
 *     Metric:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         userId: { type: string, format: uuid }
 *         name: { type: string }
 *         unit: { type: string, enum: [kg, lb, cm, min, reps, count, percent, custom] }
 *         createdAt: { type: string, format: date-time }
 */
export function metricRoutes(
  controller: MetricController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/metrics:
   *   post:
   *     tags: [Metrics]
   *     summary: Crear una métrica del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: false
   *         schema: { type: string }
   *         description: Si se envía, reintentos con la misma key y el mismo body devuelven la misma respuesta sin duplicar la métrica.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, unit]
   *             properties:
   *               name: { type: string }
   *               unit: { type: string, enum: [kg, lb, cm, min, reps, count, percent, custom] }
   *     responses:
   *       201:
   *         description: Métrica creada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Metric' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/',
    idempotency(idempotencyRepository, CREATE_METRIC_ROUTE),
    validateBody(createMetricSchema),
    controller.create,
  );

  /**
   * @openapi
   * /api/metrics:
   *   get:
   *     tags: [Metrics]
   *     summary: Listar las métricas del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, minimum: 1, maximum: 100, default: 50 }
   *       - in: query
   *         name: offset
   *         schema: { type: integer, minimum: 0, default: 0 }
   *     responses:
   *       200:
   *         description: Lista de métricas
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/Metric' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/', controller.list);

  return router;
}
