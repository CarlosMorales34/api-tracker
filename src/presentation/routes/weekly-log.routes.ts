import { Router, RequestHandler } from 'express';
import { WeeklyLogController } from '../controllers/weekly-log.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createAnnualCounterSchema, putWeekNotesSchema } from '../validators/weekly-log.validators';

const CREATE_COUNTER_ROUTE = 'weekly-log-counters:create';

/**
 * @openapi
 * components:
 *   schemas:
 *     WeeklyLogWeekSummary:
 *       type: object
 *       properties:
 *         weekNumber: { type: integer }
 *         year: { type: integer }
 *         rangeLabel: { type: string }
 *         percent: { type: integer, nullable: true }
 *     WeeklyLogYearSummary:
 *       type: object
 *       properties:
 *         year: { type: integer }
 *         weeks: { type: array, items: { $ref: '#/components/schemas/WeeklyLogWeekSummary' } }
 *         annualPercent: { type: integer, nullable: true }
 *         weeksWithData: { type: integer }
 *         categoryDistribution:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               name: { type: string }
 *               color: { type: string }
 *               hours: { type: number }
 *               percent: { type: integer }
 *     WeeklyLogWeekDetail:
 *       type: object
 *       properties:
 *         weekNumber: { type: integer }
 *         year: { type: integer }
 *         rangeLabel: { type: string }
 *         percent: { type: integer, nullable: true }
 *         deltaVsPreviousWeek: { type: integer, nullable: true }
 *         categoryHours:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               name: { type: string }
 *               color: { type: string }
 *               hours: { type: number }
 *         topActivities:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               hours: { type: number }
 *         notes: { type: string }
 *     AnnualCounter:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         year: { type: integer }
 *         value: { type: integer }
 *         previousYearValue: { type: integer, nullable: true }
 */
export function weeklyLogRoutes(
  controller: WeeklyLogController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/weekly-log/years/{year}:
   *   get:
   *     tags: [Weekly Log]
   *     summary: Resumen anual de Registro Semanal del usuario autenticado
   *     description: Semana = sábado a viernes. Semana 1 = la que contiene el primer sábado on/before el 1 de enero. 52 semanas fijas.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: year
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Resumen del año
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/WeeklyLogYearSummary' }
   *       400:
   *         description: year inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/years/:year', controller.getYear);

  /**
   * @openapi
   * /api/weekly-log/weeks/{year}/{weekNumber}:
   *   get:
   *     tags: [Weekly Log]
   *     summary: Detalle de una semana de Registro Semanal del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: year
   *         required: true
   *         schema: { type: integer }
   *       - in: path
   *         name: weekNumber
   *         required: true
   *         schema: { type: integer, minimum: 1, maximum: 52 }
   *     responses:
   *       200:
   *         description: Detalle de la semana
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/WeeklyLogWeekDetail' }
   *       400:
   *         description: year/weekNumber inválidos
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/weeks/:year/:weekNumber', controller.getWeek);

  /**
   * @openapi
   * /api/weekly-log/weeks/{year}/{weekNumber}/notes:
   *   put:
   *     tags: [Weekly Log]
   *     summary: Actualizar (upsert) las notas de una semana del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: year
   *         required: true
   *         schema: { type: integer }
   *       - in: path
   *         name: weekNumber
   *         required: true
   *         schema: { type: integer, minimum: 1, maximum: 52 }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [notes]
   *             properties:
   *               notes: { type: string }
   *     responses:
   *       200:
   *         description: Notas actualizadas
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 notes: { type: string }
   *       400:
   *         description: Body o params inválidos
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.put('/weeks/:year/:weekNumber/notes', validateBody(putWeekNotesSchema), controller.putNotes);

  /**
   * @openapi
   * /api/weekly-log/counters:
   *   get:
   *     tags: [Weekly Log]
   *     summary: Listar contadores anuales del usuario autenticado
   *     description: Sin ?year usa el año actual. previousYearValue busca un counter con el mismo name en year-1.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: year
   *         required: false
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Contadores del usuario para ese año
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/AnnualCounter' } }
   *       400:
   *         description: year inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/counters', controller.listCounters);

  /**
   * @openapi
   * /api/weekly-log/counters:
   *   post:
   *     tags: [Weekly Log]
   *     summary: Crear un contador anual del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: false
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, year, value]
   *             properties:
   *               name: { type: string, maxLength: 150 }
   *               year: { type: integer }
   *               value: { type: integer, minimum: 0 }
   *     responses:
   *       201:
   *         description: Contador creado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/AnnualCounter' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/counters',
    idempotency(idempotencyRepository, CREATE_COUNTER_ROUTE),
    validateBody(createAnnualCounterSchema),
    controller.createCounter,
  );

  /**
   * @openapi
   * /api/weekly-log/counters/{id}:
   *   delete:
   *     tags: [Weekly Log]
   *     summary: Eliminar un contador anual propio del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Contador eliminado
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.delete('/counters/:id', controller.deleteCounter);

  return router;
}
