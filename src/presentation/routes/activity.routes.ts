import { Router, RequestHandler } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createActivitySchema } from '../validators/activity.validators';

const CREATE_ACTIVITY_ROUTE = 'activities:create';

/**
 * @openapi
 * components:
 *   schemas:
 *     Activity:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         categoryId: { type: string, format: uuid }
 *         name: { type: string }
 *         sortOrder: { type: integer }
 */
export function activityRoutes(
  controller: ActivityController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/activities:
   *   post:
   *     tags: [Activities]
   *     summary: Crear una actividad dentro de una categoría propia del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: false
   *         schema: { type: string }
   *         description: Si se envía, reintentos con la misma key y el mismo body devuelven la misma respuesta sin duplicar la actividad.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [categoryId, name]
   *             properties:
   *               categoryId: { type: string, format: uuid }
   *               name: { type: string, maxLength: 150 }
   *     responses:
   *       201:
   *         description: Actividad creada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Activity' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: categoryId no existe o no pertenece al usuario autenticado
   */
  router.post(
    '/',
    idempotency(idempotencyRepository, CREATE_ACTIVITY_ROUTE),
    validateBody(createActivitySchema),
    controller.create,
  );

  /**
   * @openapi
   * /api/activities:
   *   get:
   *     tags: [Activities]
   *     summary: Listar actividades del usuario autenticado
   *     description: Sin `categoryId`, devuelve todas las actividades de todas las categorías del usuario. Con `categoryId`, filtra por esa categoría (404 si no existe o no es del usuario).
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: categoryId
   *         required: false
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Lista de actividades
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/Activity' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: categoryId no existe o no pertenece al usuario autenticado
   */
  router.get('/', controller.list);

  return router;
}
