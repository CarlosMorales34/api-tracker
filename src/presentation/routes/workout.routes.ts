import { Router, RequestHandler } from 'express';
import { WorkoutController } from '../controllers/workout.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { createWorkoutSchema, updateTrainingSettingsSchema, updateWorkoutSchema } from '../validators/workout.validators';

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
   * /api/workouts/streak:
   *   get:
   *     tags: [Workouts]
   *     summary: Racha de entrenamiento del usuario autenticado
   *     description: Días consecutivos (hasta hoy) con al menos un entrenamiento registrado -- ya sea libre o a partir de una rutina, ambos cuentan igual. Distinta de la racha de Actividades del Home (esa cuenta registros de activity_logs).
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Racha actual
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 days: { type: integer }
   *                 hasData: { type: boolean }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/streak', controller.getStreak);

  /**
   * @openapi
   * /api/workouts/settings:
   *   get:
   *     tags: [Workouts]
   *     summary: Días de descanso configurados para la racha de entrenamiento
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Configuración actual
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 restWeekdays:
   *                   type: array
   *                   items: { type: integer, minimum: 0, maximum: 6 }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/settings', controller.getSettings);

  /**
   * @openapi
   * /api/workouts/settings:
   *   put:
   *     tags: [Workouts]
   *     summary: Configurar los días de descanso (no rompen la racha de entrenamiento)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [restWeekdays]
   *             properties:
   *               restWeekdays:
   *                 type: array
   *                 items: { type: integer, minimum: 0, maximum: 6 }
   *     responses:
   *       200:
   *         description: Configuración actualizada
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.put('/settings', validateBody(updateTrainingSettingsSchema), controller.updateSettings);

  /**
   * @openapi
   * /api/workouts/{id}:
   *   put:
   *     tags: [Workouts]
   *     summary: Editar un entrenamiento propio del usuario autenticado
   *     description: Reemplaza duración, comentarios y todos los ejercicios del entrenamiento.
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
   *             required: [workoutDate, durationSeconds, comments, exercises]
   *             properties:
   *               workoutDate: { type: string, format: date }
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
   *       200:
   *         description: Entrenamiento actualizado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Workout' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.put('/:id', validateBody(updateWorkoutSchema), controller.update);

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
