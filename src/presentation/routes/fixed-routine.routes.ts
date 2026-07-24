import { Router, RequestHandler } from 'express';
import { FixedRoutineController } from '../controllers/fixed-routine.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createFixedRoutineSchema } from '../validators/fixed-routine.validators';

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
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Rutinas del usuario, ordenadas por sortOrder y luego por fecha de creación
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/FixedRoutine' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/', controller.list);

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

  return router;
}
