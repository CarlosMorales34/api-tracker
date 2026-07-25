import { Router, RequestHandler } from 'express';
import { FixedRoutineController } from '../controllers/fixed-routine.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createFixedRoutineSchema, putRoutineLogSchema, updateFixedRoutineSchema } from '../validators/fixed-routine.validators';

const CREATE_FIXED_ROUTINE_ROUTE = 'fixed-routines:create';

/**
 * @openapi
 * components:
 *   schemas:
 *     FixedRoutine:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         icon: { type: string }
 *         type: { type: string, enum: [single, range] }
 *         sortOrder: { type: integer }
 *     RoutineLogTime:
 *       type: object
 *       required: [start]
 *       properties:
 *         start: { type: string, example: '09:00' }
 *         end: { type: string, nullable: true, example: '17:30' }
 */
export function fixedRoutineRoutes(
  controller: FixedRoutineController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/fixed-routines:
   *   post:
   *     tags: [Fixed Routines]
   *     summary: Crear una rutina fija del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: false
   *         schema: { type: string }
   *         description: Si se envía, reintentos con la misma key y el mismo body devuelven la misma respuesta sin duplicar la rutina.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, icon, type]
   *             properties:
   *               name: { type: string, maxLength: 150 }
   *               icon: { type: string, maxLength: 30 }
   *               type: { type: string, enum: [single, range] }
   *     responses:
   *       201:
   *         description: Rutina fija creada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/FixedRoutine' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/',
    idempotency(idempotencyRepository, CREATE_FIXED_ROUTINE_ROUTE),
    validateBody(createFixedRoutineSchema),
    controller.create,
  );

  /**
   * @openapi
   * /api/fixed-routines:
   *   get:
   *     tags: [Fixed Routines]
   *     summary: Listar las rutinas fijas del usuario autenticado
   *     description: Sin `date`, `times` viene vacío en cada rutina. Con `date`, trae los horarios capturados (routine_logs) para ese día.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: date
   *         required: false
   *         schema: { type: string, format: date }
   *     responses:
   *       200:
   *         description: Rutinas del usuario, ordenadas por sortOrder y luego por fecha de creación
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 allOf:
   *                   - $ref: '#/components/schemas/FixedRoutine'
   *                   - type: object
   *                     properties:
   *                       times:
   *                         type: array
   *                         items: { $ref: '#/components/schemas/RoutineLogTime' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/', controller.list);

  /**
   * @openapi
   * /api/fixed-routines/{id}/log:
   *   put:
   *     tags: [Fixed Routines]
   *     summary: Registrar (o reemplazar) los horarios de una rutina fija propia en un día puntual
   *     description: times vacío borra el registro de ese día. Rutinas type=single aceptan a lo más 1 entrada.
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
   *                 items: { $ref: '#/components/schemas/RoutineLogTime' }
   *     responses:
   *       200:
   *         description: Horarios guardados
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 times:
   *                   type: array
   *                   items: { $ref: '#/components/schemas/RoutineLogTime' }
   *       400:
   *         description: Body inválido, o más de 1 horario para una rutina type=single
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.put('/:id/log', validateBody(putRoutineLogSchema), controller.putLog);

  /**
   * @openapi
   * /api/fixed-routines/{id}:
   *   delete:
   *     tags: [Fixed Routines]
   *     summary: Eliminar una rutina fija propia del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Rutina eliminada
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.delete('/:id', controller.remove);

  /**
   * @openapi
   * /api/fixed-routines/{id}:
   *   patch:
   *     tags: [Fixed Routines]
   *     summary: Actualizar nombre/ícono/tipo de una rutina fija propia del usuario autenticado
   *     description: Útil para cambiar una rutina de "single" a "range" (ej. Dormir - hora de acostarse/despertarse) sin perder su posición ni historial.
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
   *             properties:
   *               name: { type: string, maxLength: 150 }
   *               icon: { type: string, maxLength: 30 }
   *               type: { type: string, enum: [single, range] }
   *     responses:
   *       200:
   *         description: Rutina actualizada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/FixedRoutine' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.patch('/:id', validateBody(updateFixedRoutineSchema), controller.update);

  return router;
}
