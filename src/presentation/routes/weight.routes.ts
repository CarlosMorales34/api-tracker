import { Router, RequestHandler } from 'express';
import { WeightController } from '../controllers/weight.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { putWeightMonthNoteSchema, putWeightMonthSchema, putWeightSettingsSchema } from '../validators/weight.validators';

/**
 * @openapi
 * components:
 *   schemas:
 *     WeightMonth:
 *       type: object
 *       properties:
 *         year: { type: integer }
 *         month: { type: integer, minimum: 1, maximum: 12 }
 *         value: { type: number, nullable: true }
 *         note: { type: string, nullable: true }
 *     WeightSettings:
 *       type: object
 *       properties:
 *         goalKg: { type: number }
 *         goalDirection: { type: string, enum: [lose, gain], description: "'lose' = mejor es el valor más bajo; 'gain' = mejor es el más alto" }
 *     WeightYearSummary:
 *       type: object
 *       properties:
 *         year: { type: integer }
 *         months: { type: array, items: { $ref: '#/components/schemas/WeightMonth' } }
 *         currentWeight: { type: number, nullable: true }
 *         deltaVsPreviousMonth: { type: number, nullable: true }
 *         bestEver:
 *           type: object
 *           nullable: true
 *           properties:
 *             value: { type: number }
 *             year: { type: integer }
 *             month: { type: integer }
 *         goalKg: { type: number }
 *         goalDirection: { type: string, enum: [lose, gain] }
 *     WeightYearExtreme:
 *       type: object
 *       properties:
 *         year: { type: integer }
 *         bestMonth: { type: integer }
 *         bestValue: { type: number }
 *         worstMonth: { type: integer }
 *         worstValue: { type: number }
 */
export function weightRoutes(controller: WeightController, authenticateMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/weight/years/{year}:
   *   get:
   *     tags: [Weight]
   *     summary: Resumen anual de peso del usuario autenticado
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
   *             schema: { $ref: '#/components/schemas/WeightYearSummary' }
   *       400:
   *         description: year inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/years/:year', controller.getYear);

  /**
   * @openapi
   * /api/weight/months:
   *   put:
   *     tags: [Weight]
   *     summary: Registrar (o borrar con value null) el peso de un mes del usuario autenticado
   *     description: Upsert por (userId, year, month). Conserva el note existente si no se manda.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [year, month, value]
   *             properties:
   *               year: { type: integer }
   *               month: { type: integer, minimum: 1, maximum: 12 }
   *               value: { type: number, nullable: true }
   *     responses:
   *       200:
   *         description: Registro actualizado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/WeightMonth' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.put('/months', validateBody(putWeightMonthSchema), controller.putMonth);

  /**
   * @openapi
   * /api/weight/months/note:
   *   put:
   *     tags: [Weight]
   *     summary: Registrar la nota de un mes del usuario autenticado
   *     description: Upsert por (userId, year, month). Conserva el value existente.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [year, month, note]
   *             properties:
   *               year: { type: integer }
   *               month: { type: integer, minimum: 1, maximum: 12 }
   *               note: { type: string }
   *     responses:
   *       200:
   *         description: Nota actualizada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/WeightMonth' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.put('/months/note', validateBody(putWeightMonthNoteSchema), controller.putMonthNote);

  /**
   * @openapi
   * /api/weight/settings:
   *   get:
   *     tags: [Weight]
   *     summary: Meta de peso del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Settings del usuario (default goalKg 60)
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/WeightSettings' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/settings', controller.getSettings);

  /**
   * @openapi
   * /api/weight/settings:
   *   put:
   *     tags: [Weight]
   *     summary: Actualizar (upsert) la meta de peso del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [goalKg, goalDirection]
   *             properties:
   *               goalKg: { type: number, exclusiveMinimum: 0 }
   *               goalDirection: { type: string, enum: [lose, gain] }
   *     responses:
   *       200:
   *         description: Settings actualizados
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/WeightSettings' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.put('/settings', validateBody(putWeightSettingsSchema), controller.putSettings);

  /**
   * @openapi
   * /api/weight/yearly-extremes:
   *   get:
   *     tags: [Weight]
   *     summary: Mejor y peor mes de cada año con datos, del usuario autenticado
   *     description: >
   *       "Mejor"/"peor" respetan goalDirection de WeightSettings ('lose' = mejor es el
   *       valor más bajo; 'gain' = mejor es el más alto). Solo considera meses con dato
   *       (años incompletos no se rellenan ni se excluyen, solo se ignoran los meses null).
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Un elemento por cada año con al menos un mes registrado, ordenado ascendente
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/WeightYearExtreme' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/yearly-extremes', controller.getYearlyExtremes);

  return router;
}
