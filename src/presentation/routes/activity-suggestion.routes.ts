import { Router, RequestHandler } from 'express';
import { ActivitySuggestionController } from '../controllers/activity-suggestion.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { acceptSuggestionSchema, updateSuggestionSettingsSchema } from '../validators/activity-suggestion.validators';

/**
 * @openapi
 * components:
 *   schemas:
 *     ActivitySuggestion:
 *       type: object
 *       description: Propuesta pendiente de decisión del usuario, generada a partir de patrones detectados en el historial. Nunca implica que ya se haya creado o modificado nada.
 *       properties:
 *         id: { type: string, format: uuid }
 *         suggestionType: { type: string, enum: [create_routine, update_routine, fill_activity_fields, suggest_category, suggest_activity_name, suggest_duration, suggest_schedule, suggest_next_occurrence] }
 *         activityId: { type: string, format: uuid, nullable: true }
 *         categoryId: { type: string, format: uuid, nullable: true }
 *         routineId: { type: string, format: uuid, nullable: true }
 *         suggestedDays: { type: array, items: { type: integer, minimum: 0, maximum: 6 }, nullable: true }
 *         suggestedStartTime: { type: string, nullable: true, example: '09:00' }
 *         suggestedEndTime: { type: string, nullable: true, example: '17:30' }
 *         suggestedDurationMinutes: { type: integer, nullable: true }
 *         confidence: { type: number, minimum: 0, maximum: 1 }
 *         sampleCount: { type: integer }
 *         distinctWeeks: { type: integer }
 *         reason: { type: string, description: 'Explicación breve de por qué se muestra esta sugerencia -- siempre presente, nunca se omite.' }
 *         status: { type: string, enum: [pending, accepted, accepted_with_changes, dismissed, expired] }
 */
export function activitySuggestionRoutes(
  controller: ActivitySuggestionController,
  authenticateMiddleware: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/activity-suggestions/generate:
   *   post:
   *     tags: [Activity Suggestions]
   *     summary: Recalcular sugerencias pendientes del usuario autenticado a partir de su historial
   *     description: No crea, modifica ni borra actividades/rutinas -- solo deja propuestas nuevas en estado 'pending'. Si las sugerencias están desactivadas (ver /settings), no genera nada.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Sugerencias nuevas generadas en esta corrida (puede ser un arreglo vacío)
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/ActivitySuggestion' } }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post('/generate', controller.generate);

  /**
   * @openapi
   * /api/activity-suggestions:
   *   get:
   *     tags: [Activity Suggestions]
   *     summary: Listar sugerencias pendientes del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Sugerencias pendientes, ordenadas por confianza descendente
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/ActivitySuggestion' } }
   *       401:
   *         description: Access token faltante, inválido o expirado
   *   delete:
   *     tags: [Activity Suggestions]
   *     summary: Borrar todo el historial de sugerencias y feedback del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       204:
   *         description: Historial borrado
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/', controller.list);
  router.delete('/', controller.clearHistory);

  /**
   * @openapi
   * /api/activity-suggestions/settings:
   *   get:
   *     tags: [Activity Suggestions]
   *     summary: Obtener si las sugerencias están activadas para el usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Preferencia actual
   *   put:
   *     tags: [Activity Suggestions]
   *     summary: Activar o desactivar las sugerencias para el usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [suggestionsEnabled]
   *             properties:
   *               suggestionsEnabled: { type: boolean }
   *     responses:
   *       200:
   *         description: Preferencia actualizada
   */
  router.get('/settings', controller.getSettings);
  router.put('/settings', validateBody(updateSuggestionSettingsSchema), controller.updateSettings);

  /**
   * @openapi
   * /api/activity-suggestions/{id}/accept:
   *   post:
   *     tags: [Activity Suggestions]
   *     summary: Aceptar una sugerencia propia, opcionalmente con cambios hechos en el editor
   *     description: No crea la actividad/rutina por sí sola -- el front usa los valores (aceptados o editados) como punto de partida del formulario normal de creación. Si `finalValues` difiere de lo sugerido, queda registrado como 'accepted_with_changes'.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               finalValues: { type: object }
   *     responses:
   *       204:
   *         description: Sugerencia aceptada
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe, no pertenece al usuario autenticado, o ya no está pendiente
   */
  router.post('/:id/accept', validateBody(acceptSuggestionSchema), controller.accept);

  /**
   * @openapi
   * /api/activity-suggestions/{id}/dismiss:
   *   post:
   *     tags: [Activity Suggestions]
   *     summary: Descartar una sugerencia propia
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Sugerencia descartada
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe, no pertenece al usuario autenticado, o ya no está pendiente
   */
  router.post('/:id/dismiss', controller.dismiss);

  return router;
}
