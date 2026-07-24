import { Router, RequestHandler } from 'express';
import { ActivityLogController } from '../controllers/activity-log.controller';

/**
 * @openapi
 * components:
 *   schemas:
 *     ActivityLog:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         activityId: { type: string, format: uuid }
 *         logDate: { type: string, format: date }
 *         hours: { type: number }
 *         note: { type: string, nullable: true }
 */
export function activityLogRoutes(controller: ActivityLogController, authenticateMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/activity-logs:
   *   get:
   *     tags: [Activity Logs]
   *     summary: Listar registros de horas por actividad del usuario autenticado en un rango de fechas
   *     description: activity_logs es de solo lectura vía API (sin endpoint de escritura, es intencional); esta es la pieza que faltaba para que Registro Semanal pueda consumir el dato ya capturado por otro medio.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: from
   *         required: true
   *         schema: { type: string, format: date }
   *       - in: query
   *         name: to
   *         required: true
   *         schema: { type: string, format: date }
   *     responses:
   *       200:
   *         description: Registros en el rango
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/ActivityLog' } }
   *       400:
   *         description: from/to faltantes o inválidos
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/', controller.list);

  return router;
}
