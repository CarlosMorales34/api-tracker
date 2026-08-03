import { Router, RequestHandler } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createActivitySchema, putDailyFeedbackSchema, reorderActivitiesSchema } from '../validators/activity.validators';
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
 *           description: Solo presente cuando la request de listado incluye `date`. Total de todos los turnos del día (manuales + reflejados de una rutina vinculada).
 *         todayTimes:
 *           type: array
 *           description: Solo presente cuando la request de listado incluye `date`.
 *           items: { $ref: '#/components/schemas/ActivityLogTime' }
 *     ActivityLogTime:
 *       type: object
 *       properties:
 *         start: { type: string, example: '13:00' }
 *         end: { type: string, example: '14:00' }
 *         source: { type: string, enum: [manual, routine] }
 *         routineName:
 *           type: string
 *           nullable: true
 *           description: Nombre de la rutina fija que originó este turno (solo si source=routine).
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
   *     summary: Registrar (o reemplazar) los turnos manuales de una actividad propia en un día puntual
   *     description: Reemplaza únicamente los turnos capturados a mano (source=manual); los reflejados de una rutina vinculada (source=routine) no se tocan acá, se editan desde la rutina. times vacío borra los turnos manuales de ese día.
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
   *             required: [date, times]
   *             properties:
   *               date: { type: string, format: date }
   *               times:
   *                 type: array
   *                 maxItems: 8
   *                 items:
   *                   type: object
   *                   required: [start, end]
   *                   properties:
   *                     start: { type: string, example: '13:00' }
   *                     end: { type: string, example: '14:00' }
   *     responses:
   *       200:
   *         description: Turnos guardados, con el total del día ya recalculado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 hours: { type: number, nullable: true }
   *                 times:
   *                   type: array
   *                   items: { $ref: '#/components/schemas/ActivityLogTime' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.put('/:id/log', validateBody(putActivityLogSchema), controller.putLog);

  /**
   * @openapi
   * /api/activities/feedback:
   *   get:
   *     tags: [Activities]
   *     summary: Obtener el feedback diario (nota de texto libre) del usuario autenticado para un día
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: date
   *         required: true
   *         schema: { type: string, format: date }
   *     responses:
   *       200:
   *         description: Nota del día (vacía si no se ha escrito nada)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 note: { type: string }
   *       400:
   *         description: date faltante
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/feedback', controller.getFeedback);

  /**
   * @openapi
   * /api/activities/feedback:
   *   put:
   *     tags: [Activities]
   *     summary: Guardar (o reemplazar) el feedback diario del usuario autenticado para un día
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [date, note]
   *             properties:
   *               date: { type: string, format: date }
   *               note: { type: string, maxLength: 5000 }
   *     responses:
   *       200:
   *         description: Nota guardada
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 note: { type: string }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.put('/feedback', validateBody(putDailyFeedbackSchema), controller.putFeedback);

  /**
   * @openapi
   * /api/activities/{id}:
   *   delete:
   *     tags: [Activities]
   *     summary: Eliminar una actividad propia del usuario autenticado
   *     description: Borra en cascada sus registros de horas y turnos. Las rutinas fijas vinculadas a esta actividad quedan sin vínculo.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Actividad eliminada
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.delete('/:id', controller.delete);

  return router;
}
