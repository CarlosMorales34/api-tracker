import { Router, RequestHandler } from 'express';
import { BodyProgressController } from '../controllers/body-progress.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createBodyMeasurementSchema, setBodyGoalSchema, updateBodyMeasurementSchema } from '../validators/body-progress.validators';

const CREATE_MEASUREMENT_ROUTE = 'body-measurements:create';
const SET_GOAL_ROUTE = 'body-goals:set';

/**
 * @openapi
 * components:
 *   schemas:
 *     BodyMeasurement:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         measuredAt: { type: string, format: date-time }
 *         weightKg: { type: number, nullable: true }
 *         bodyFatPercentage: { type: number, nullable: true }
 *         waistCm: { type: number, nullable: true }
 *         chestCm: { type: number, nullable: true }
 *         hipsCm: { type: number, nullable: true }
 *         notes: { type: string, nullable: true }
 *         source: { type: string, enum: [manual] }
 *     BodyGoal:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         goalType: { type: string, enum: [lose, gain, maintain, recomp] }
 *         startWeightKg: { type: number }
 *         targetWeightKg: { type: number, nullable: true }
 *         startDate: { type: string, format: date }
 *         targetDate: { type: string, format: date, nullable: true }
 *         isActive: { type: boolean }
 */
export function bodyMeasurementRoutes(
  controller: BodyProgressController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/body-measurements:
   *   get:
   *     tags: [Body Progress]
   *     summary: Mediciones del usuario autenticado en un rango de fechas
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: from
   *         required: true
   *         schema: { type: string, format: date }
   *       - in: query
   *         name: to
   *         required: false
   *         schema: { type: string, format: date }
   *         description: Default hoy.
   *     responses:
   *       200:
   *         description: Mediciones del período
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/BodyMeasurement' } }
   *       400:
   *         description: from faltante o inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/', controller.listMeasurements);

  /**
   * @openapi
   * /api/body-measurements/summary:
   *   get:
   *     tags: [Body Progress]
   *     summary: Indicadores de Progreso corporal del usuario autenticado (peso actual, cambios, ritmo, tendencia)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Resumen de progreso corporal
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/summary', controller.getSummary);

  /**
   * @openapi
   * /api/body-measurements:
   *   post:
   *     tags: [Body Progress]
   *     summary: Registrar una medición del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: false
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [measuredAt]
   *             properties:
   *               measuredAt: { type: string, format: date-time }
   *               weightKg: { type: number, nullable: true }
   *               bodyFatPercentage: { type: number, nullable: true }
   *               waistCm: { type: number, nullable: true }
   *               chestCm: { type: number, nullable: true }
   *               hipsCm: { type: number, nullable: true }
   *               notes: { type: string, nullable: true }
   *     responses:
   *       201:
   *         description: Medición creada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/BodyMeasurement' }
   *       400:
   *         description: Body inválido (ninguna métrica presente)
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/',
    idempotency(idempotencyRepository, CREATE_MEASUREMENT_ROUTE),
    validateBody(createBodyMeasurementSchema),
    controller.createMeasurement,
  );

  /**
   * @openapi
   * /api/body-measurements/{id}:
   *   put:
   *     tags: [Body Progress]
   *     summary: Editar una medición propia del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Medición actualizada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/BodyMeasurement' }
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.put('/:id', validateBody(updateBodyMeasurementSchema), controller.updateMeasurement);

  /**
   * @openapi
   * /api/body-measurements/{id}:
   *   delete:
   *     tags: [Body Progress]
   *     summary: Eliminar una medición propia del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Medición eliminada
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.delete('/:id', controller.deleteMeasurement);

  return router;
}

export function bodyGoalRoutes(
  controller: BodyProgressController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/body-goals/history:
   *   get:
   *     tags: [Body Progress]
   *     summary: Historial de metas (activa e inactivas) del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Historial de metas, más reciente primero
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/BodyGoal' } }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/history', controller.getGoalHistory);

  /**
   * @openapi
   * /api/body-goals:
   *   post:
   *     tags: [Body Progress]
   *     summary: Fijar una nueva meta activa (desactiva la anterior sin borrarla)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: false
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [goalType, startWeightKg, startDate]
   *             properties:
   *               goalType: { type: string, enum: [lose, gain, maintain, recomp] }
   *               startWeightKg: { type: number }
   *               targetWeightKg: { type: number, nullable: true }
   *               startDate: { type: string, format: date }
   *               targetDate: { type: string, format: date, nullable: true }
   *     responses:
   *       201:
   *         description: Meta creada y activa
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/BodyGoal' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/',
    idempotency(idempotencyRepository, SET_GOAL_ROUTE),
    validateBody(setBodyGoalSchema),
    controller.setGoal,
  );

  return router;
}
