import { Router, RequestHandler } from 'express';
import { WorkoutRoutineController } from '../controllers/workout-routine.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { createWorkoutRoutineSchema, updateWorkoutRoutineSchema } from '../validators/workout-routine.validators';

/**
 * @openapi
 * components:
 *   schemas:
 *     WorkoutRoutineExercise:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         targetSets: { type: integer }
 *         targetReps: { type: integer }
 *         suggestedWeight: { type: number, nullable: true }
 *     WorkoutRoutine:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         weekday: { type: integer, nullable: true, minimum: 0, maximum: 6, description: "0=domingo..6=sábado (Date#getDay()). Si está seteado, el front la recomienda al crear un entrenamiento ese día." }
 *         exercises: { type: array, items: { $ref: '#/components/schemas/WorkoutRoutineExercise' } }
 */
export function workoutRoutineRoutes(controller: WorkoutRoutineController, authenticateMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/workout-routines:
   *   post:
   *     tags: [Workout Routines]
   *     summary: Crear una rutina fija de entrenamiento del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, weekday, exercises]
   *             properties:
   *               name: { type: string, maxLength: 150 }
   *               weekday: { type: integer, nullable: true, minimum: 0, maximum: 6 }
   *               exercises:
   *                 type: array
   *                 items: { $ref: '#/components/schemas/WorkoutRoutineExercise' }
   *     responses:
   *       201:
   *         description: Rutina creada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/WorkoutRoutine' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post('/', validateBody(createWorkoutRoutineSchema), controller.create);

  /**
   * @openapi
   * /api/workout-routines:
   *   get:
   *     tags: [Workout Routines]
   *     summary: Listar las rutinas del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Rutinas del usuario
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/WorkoutRoutine' } }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/', controller.list);

  /**
   * @openapi
   * /api/workout-routines/{id}:
   *   put:
   *     tags: [Workout Routines]
   *     summary: Editar una rutina propia del usuario autenticado
   *     description: Reemplaza nombre, día y todos los ejercicios de la rutina.
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
   *             required: [name, weekday, exercises]
   *             properties:
   *               name: { type: string, maxLength: 150 }
   *               weekday: { type: integer, nullable: true, minimum: 0, maximum: 6 }
   *               exercises:
   *                 type: array
   *                 items: { $ref: '#/components/schemas/WorkoutRoutineExercise' }
   *     responses:
   *       200:
   *         description: Rutina actualizada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/WorkoutRoutine' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.put('/:id', validateBody(updateWorkoutRoutineSchema), controller.update);

  /**
   * @openapi
   * /api/workout-routines/{id}:
   *   delete:
   *     tags: [Workout Routines]
   *     summary: Eliminar una rutina propia del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Eliminada
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.delete('/:id', controller.delete);

  return router;
}
