import { Router, RequestHandler } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createActivitySchema, reorderActivitiesSchema } from '../validators/activity.validators';
import { putActivityLogSchema } from '../validators/activity-log.validators';

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
 *         todayHours:
 *           type: number
 *           nullable: true
 *           description: Solo presente cuando la request de listado incluye `date`.
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
   *     description: Sin `categoryId`, devuelve todas las actividades de todas las categorías del usuario. Con `categoryId`, filtra por esa categoría (404 si no existe o no es del usuario). Sin `date`, `todayHours` viene ausente/null; con `date`, trae las horas capturadas (activity_logs) para ese día.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: categoryId
   *         required: false
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: date
   *         required: false
   *         schema: { type: string, format: date }
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

  /**
   * @openapi
   * /api/activities/reorder:
   *   patch:
   *     tags: [Activities]
   *     summary: Reordenar las actividades de una categoría propia del usuario autenticado
   *     description: orderedIds debe contener exactamente los ids de todas las actividades de esa categoría, en el nuevo orden deseado.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [categoryId, orderedIds]
   *             properties:
   *               categoryId: { type: string, format: uuid }
   *               orderedIds:
   *                 type: array
   *                 items: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Orden actualizado
   *       400:
   *         description: orderedIds no coincide exactamente con las actividades de la categoría
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: categoryId no existe o no pertenece al usuario autenticado
   */
  router.patch('/reorder', validateBody(reorderActivitiesSchema), controller.reorder);

  /**
   * @openapi
   * /api/activities/{id}/log:
   *   put:
   *     tags: [Activities]
   *     summary: Registrar (o reemplazar) las horas de una actividad propia en un día puntual
   *     description: hours null borra el registro de ese día.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [date, hours]
   *             properties:
   *               date: { type: string, format: date }
   *               hours: { type: number, exclusiveMinimum: 0, maximum: 24, nullable: true }
   *     responses:
   *       200:
   *         description: Horas guardadas
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 hours: { type: number, nullable: true }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.put('/:id/log', validateBody(putActivityLogSchema), controller.putLog);

  return router;
}
