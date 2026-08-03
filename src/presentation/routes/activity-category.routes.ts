import { Router, RequestHandler } from 'express';
import { ActivityCategoryController } from '../controllers/activity-category.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createActivityCategorySchema, reorderActivityCategoriesSchema } from '../validators/activity-category.validators';

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

  /**
   * @openapi
   * /api/activity-categories/reorder:
   *   patch:
   *     tags: [Activity Categories]
   *     summary: Reordenar las categorías del usuario autenticado
   *     description: orderedIds debe contener exactamente los ids de todas las categorías del usuario, en el nuevo orden deseado.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [orderedIds]
   *             properties:
   *               orderedIds:
   *                 type: array
   *                 items: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Orden actualizado
   *       400:
   *         description: orderedIds no coincide exactamente con las categorías del usuario
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.patch('/reorder', validateBody(reorderActivityCategoriesSchema), controller.reorder);

  /**
   * @openapi
   * /api/activity-categories/{id}:
   *   delete:
   *     tags: [Activity Categories]
   *     summary: Eliminar una categoría propia del usuario autenticado
   *     description: Borra en cascada sus actividades, los registros de horas y los turnos asociados. Las rutinas fijas vinculadas a alguna de esas actividades quedan sin vínculo.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Categoría eliminada
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.delete('/:id', controller.delete);

  return router;
}
