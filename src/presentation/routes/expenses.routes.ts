import { Router, RequestHandler } from 'express';
import { ExpensesController } from '../controllers/expenses.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createDailyExpenseSchema,
  createFixedMonthlyExpenseSchema,
  updateDailyExpenseSchema,
  updateFixedMonthlyExpenseSchema,
} from '../validators/expenses.validators';

const CREATE_DAILY_EXPENSE_ROUTE = 'expenses-daily:create';
const CREATE_FIXED_EXPENSE_ROUTE = 'expenses-fixed:create';

/**
 * @openapi
 * components:
 *   schemas:
 *     DailyExpense:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         amount: { type: number }
 *         expenseDate: { type: string, format: date }
 *     FixedMonthlyExpense:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         amount: { type: number }
 *     ExpensesSummary:
 *       type: object
 *       properties:
 *         monthIncome: { type: number }
 *         monthDailyTotal: { type: number }
 *         fixedTotal: { type: number }
 *         monthExpenseTotal: { type: number }
 *         sobrante: { type: number }
 *         weekTotal: { type: number }
 *         currency: { type: string, enum: [MXN, USD] }
 */
export function expensesRoutes(
  controller: ExpensesController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/expenses/daily:
   *   get:
   *     tags: [Expenses]
   *     summary: Listar gastos diarios del usuario autenticado para una fecha (default hoy)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: date
   *         required: false
   *         schema: { type: string, format: date }
   *     responses:
   *       200:
   *         description: Gastos diarios de la fecha
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/DailyExpense' } }
   *       400:
   *         description: date inválida
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/daily', controller.listDaily);

  /**
   * @openapi
   * /api/expenses/daily:
   *   post:
   *     tags: [Expenses]
   *     summary: Crear un gasto diario del usuario autenticado
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
   *             required: [name, amount, expenseDate]
   *             properties:
   *               name: { type: string, maxLength: 150 }
   *               amount: { type: number, exclusiveMinimum: 0 }
   *               expenseDate: { type: string, format: date }
   *     responses:
   *       201:
   *         description: Gasto diario creado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/DailyExpense' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/daily',
    idempotency(idempotencyRepository, CREATE_DAILY_EXPENSE_ROUTE),
    validateBody(createDailyExpenseSchema),
    controller.createDaily,
  );

  /**
   * @openapi
   * /api/expenses/daily/{id}:
   *   patch:
   *     tags: [Expenses]
   *     summary: Actualizar name/amount de un gasto diario propio del usuario autenticado
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
   *               amount: { type: number, exclusiveMinimum: 0 }
   *     responses:
   *       200:
   *         description: Gasto diario actualizado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/DailyExpense' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.patch('/daily/:id', validateBody(updateDailyExpenseSchema), controller.updateDaily);

  /**
   * @openapi
   * /api/expenses/daily/{id}:
   *   delete:
   *     tags: [Expenses]
   *     summary: Eliminar un gasto diario propio del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Gasto diario eliminado
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.delete('/daily/:id', controller.deleteDaily);

  /**
   * @openapi
   * /api/expenses/fixed:
   *   get:
   *     tags: [Expenses]
   *     summary: Listar gastos fijos mensuales del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Gastos fijos del usuario
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/FixedMonthlyExpense' } }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/fixed', controller.listFixed);

  /**
   * @openapi
   * /api/expenses/fixed:
   *   post:
   *     tags: [Expenses]
   *     summary: Crear un gasto fijo mensual del usuario autenticado
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
   *             required: [name, amount]
   *             properties:
   *               name: { type: string, maxLength: 150 }
   *               amount: { type: number, exclusiveMinimum: 0 }
   *     responses:
   *       201:
   *         description: Gasto fijo creado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/FixedMonthlyExpense' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/fixed',
    idempotency(idempotencyRepository, CREATE_FIXED_EXPENSE_ROUTE),
    validateBody(createFixedMonthlyExpenseSchema),
    controller.createFixed,
  );

  /**
   * @openapi
   * /api/expenses/fixed/{id}:
   *   patch:
   *     tags: [Expenses]
   *     summary: Actualizar name/amount de un gasto fijo propio del usuario autenticado
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
   *               amount: { type: number, exclusiveMinimum: 0 }
   *     responses:
   *       200:
   *         description: Gasto fijo actualizado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/FixedMonthlyExpense' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.patch('/fixed/:id', validateBody(updateFixedMonthlyExpenseSchema), controller.updateFixed);

  /**
   * @openapi
   * /api/expenses/fixed/{id}:
   *   delete:
   *     tags: [Expenses]
   *     summary: Eliminar un gasto fijo propio del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Gasto fijo eliminado
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.delete('/fixed/:id', controller.deleteFixed);

  /**
   * @openapi
   * /api/expenses/summary:
   *   get:
   *     tags: [Expenses]
   *     summary: Resumen de gastos del mes/semana que contiene una fecha (default hoy)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: date
   *         required: false
   *         schema: { type: string, format: date }
   *     responses:
   *       200:
   *         description: Resumen de gastos
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ExpensesSummary' }
   *       400:
   *         description: date inválida
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/summary', controller.getSummary);

  return router;
}
