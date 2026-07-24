import { Router, RequestHandler } from 'express';
import { ActivityCategoryController } from '../controllers/activity-category.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createActivityCategorySchema } from '../validators/activity-category.validators';

const CREATE_ACTIVITY_CATEGORY_ROUTE = 'activity-categories:create';

/**
 * @openapi
 * components:
 *   schemas:
 *     ActivityCategory:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         color: { type: string, pattern: '^#[0-9a-fA-F]{6}$' }
 *         sortOrder: { type: integer }
 */
export function activityCategoryRoutes(
  controller: ActivityCategoryController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/activity-categories:
   *   post:
   *     tags: [Activity Categories]
   *     summary: Crear una categoría de actividad del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: false
   *         schema: { type: string }
   *         description: Si se envía, reintentos con la misma key y el mismo body devuelven la misma respuesta sin duplicar la categoría.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, color]
   *             properties:
   *               name: { type: string, maxLength: 120 }
   *               color: { type: string, pattern: '^#[0-9a-fA-F]{6}$' }
   *     responses:
   *       201:
   *         description: Categoría creada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ActivityCategory' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/',
    idempotency(idempotencyRepository, CREATE_ACTIVITY_CATEGORY_ROUTE),
    validateBody(createActivityCategorySchema),
    controller.create,
  );

  /**
   * @openapi
   * /api/activity-categories:
   *   get:
   *     tags: [Activity Categories]
   *     summary: Listar las categorías de actividad del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Categorías del usuario, ordenadas por sortOrder y luego por fecha de creación
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/ActivityCategory' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/', controller.list);

  return router;
}
