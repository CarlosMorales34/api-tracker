import { Router, RequestHandler } from 'express';
import { WorkoutController } from '../controllers/workout.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { createWorkoutSchema } from '../validators/workout.validators';

/**
 * @openapi
 * components:
 *   schemas:
 *     WorkoutExercise:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         weight: { type: number, nullable: true }
 *         sets: { type: integer }
 *         reps: { type: array, items: { type: integer } }
 *     Workout:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         workoutDate: { type: string, format: date }
 *         durationSeconds: { type: integer }
 *         comments: { type: string, nullable: true }
 *         exercises: { type: array, items: { $ref: '#/components/schemas/WorkoutExercise' } }
 */
export function workoutRoutes(controller: WorkoutController, authenticateMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/workouts:
   *   post:
   *     tags: [Workouts]
   *     summary: Registrar un entrenamiento del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [durationSeconds, comments, exercises]
   *             properties:
   *               workoutDate: { type: string, format: date, description: "Default: hoy" }
   *               durationSeconds: { type: integer, minimum: 0 }
   *               comments: { type: string, nullable: true }
   *               exercises:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required: [name, weight, sets, reps]
   *                   properties:
   *                     name: { type: string }
   *                     weight: { type: number, nullable: true }
   *                     sets: { type: integer, minimum: 1 }
   *                     reps: { type: array, items: { type: integer } }
   *     responses:
   *       201:
   *         description: Entrenamiento creado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Workout' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post('/', validateBody(createWorkoutSchema), controller.create);

  /**
   * @openapi
   * /api/workouts:
   *   get:
   *     tags: [Workouts]
   *     summary: Entrenamientos de una semana del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: weekStart
   *         required: true
   *         schema: { type: string, format: date }
   *     responses:
   *       200:
   *         description: Entrenamientos de la semana, más reciente primero
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/Workout' } }
   *       400:
   *         description: weekStart inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/', controller.listForWeek);

  /**
   * @openapi
   * /api/workouts/performance:
   *   get:
   *     tags: [Workouts]
   *     summary: Rendimiento entre sesiones (volumen por sesión + progresión por ejercicio)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Series para las gráficas de rendimiento
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/performance', controller.getPerformance);

  /**
   * @openapi
   * /api/workouts/{id}:
   *   delete:
   *     tags: [Workouts]
   *     summary: Eliminar un entrenamiento del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Eliminado
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.delete('/:id', controller.delete);

  return router;
}
