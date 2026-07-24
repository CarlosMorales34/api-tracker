import { Router, RequestHandler } from 'express';
import { HomeController } from '../controllers/home.controller';

/**
 * @openapi
 * components:
 *   schemas:
 *     HomeSummary:
 *       type: object
 *       properties:
 *         streak:
 *           type: object
 *           properties: { days: { type: integer }, hasData: { type: boolean } }
 *         productivity:
 *           type: object
 *           properties: { percent: { type: number, nullable: true }, hasData: { type: boolean } }
 *         categoryHours:
 *           type: array
 *           items:
 *             type: object
 *             properties: { categoryId: { type: string }, name: { type: string }, color: { type: string }, hours: { type: number } }
 *         monthlyBalance:
 *           type: object
 *           properties: { amount: { type: number }, income: { type: number }, expenses: { type: number }, hasData: { type: boolean } }
 *         currentWeight:
 *           type: object
 *           properties: { kg: { type: number, nullable: true }, goalKg: { type: number }, hasData: { type: boolean } }
 *         annualBalance:
 *           type: object
 *           properties:
 *             year: { type: integer }
 *             amount: { type: number }
 *             growthPercentVsPreviousYear: { type: number, nullable: true }
 *             byYear: { type: array, items: { type: object, properties: { year: { type: integer }, amount: { type: number } } } }
 *             hasData: { type: boolean }
 */
export function homeRoutes(controller: HomeController, authenticateMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/home/summary:
   *   get:
   *     tags: [Home]
   *     summary: Resumen agregado del Home (racha, productividad de la semana, horas por categoría, balance del mes, peso actual, balance anual) del usuario autenticado
   *     description: >
   *       Cada sección trae su propio `hasData` -- un 0 real (ej. balance del mes en 0) es
   *       distinto de "todavía no hay datos", y el front decide el estado vacío ("estamos
   *       conociéndote") según ese flag, no según el valor.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Resumen del home
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/HomeSummary' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/summary', controller.getSummary);

  return router;
}
