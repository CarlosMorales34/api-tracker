import { Router, RequestHandler } from 'express';
import { FinanceController } from '../controllers/finance.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createDebtPaymentSchema,
  createMoneyEntrySchema,
  createSavingsEntrySchema,
  updateFinanceSettingsSchema,
  updateMoneyEntrySchema,
} from '../validators/finance.validators';

const CREATE_ENTRY_ROUTE = 'finance-entries:create';
const CREATE_DEBT_PAYMENT_ROUTE = 'finance-debt-payments:create';
const CREATE_SAVINGS_ROUTE = 'finance-savings:create';

/**
 * @openapi
 * components:
 *   schemas:
 *     MoneyEntry:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         type: { type: string, enum: [income, expense] }
 *         name: { type: string }
 *         amount: { type: number }
 *         weekStartDate: { type: string, format: date }
 *     FinanceSettings:
 *       type: object
 *       properties:
 *         debtTotal: { type: number }
 *         currency: { type: string, enum: [MXN, USD] }
 *     FinanceWeekSummary:
 *       type: object
 *       properties:
 *         weekStartDate: { type: string, format: date }
 *         income: { type: array, items: { $ref: '#/components/schemas/MoneyEntry' } }
 *         expense: { type: array, items: { $ref: '#/components/schemas/MoneyEntry' } }
 *         totalIncome: { type: number }
 *         totalExpense: { type: number }
 *         debtTotal: { type: number }
 *         debtPaid: { type: number }
 *         debtRemaining: { type: number }
 *         weekAbono: { type: number }
 *         savingsAccumulated: { type: number }
 *         weekSavings: { type: number }
 *         currency: { type: string, enum: [MXN, USD] }
 */
export function financeRoutes(
  controller: FinanceController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/finance/settings:
   *   get:
   *     tags: [Finance]
   *     summary: Settings financieros del usuario autenticado (deuda total y moneda)
   *     description: Si el usuario no tiene fila en user_finance_settings, devuelve el default { debtTotal 0, currency MXN } sin crear fila.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Settings del usuario
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/FinanceSettings' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/settings', controller.getSettings);

  /**
   * @openapi
   * /api/finance/settings:
   *   put:
   *     tags: [Finance]
   *     summary: Actualizar (upsert) los settings financieros del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               debtTotal: { type: number, minimum: 0 }
   *               currency: { type: string, enum: [MXN, USD] }
   *     responses:
   *       200:
   *         description: Settings actualizados (estado completo)
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/FinanceSettings' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.put('/settings', validateBody(updateFinanceSettingsSchema), controller.updateSettings);

  /**
   * @openapi
   * /api/finance/weeks/{weekStartDate}:
   *   get:
   *     tags: [Finance]
   *     summary: Resumen financiero de una semana (sábado a viernes) del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: weekStartDate
   *         required: true
   *         schema: { type: string, format: date }
   *         description: Sábado de inicio de semana, YYYY-MM-DD
   *     responses:
   *       200:
   *         description: Resumen de la semana
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/FinanceWeekSummary' }
   *       400:
   *         description: weekStartDate inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/weeks/:weekStartDate', controller.getWeekSummary);

  /**
   * @openapi
   * /api/finance/entries:
   *   post:
   *     tags: [Finance]
   *     summary: Crear un ingreso o gasto de una semana propia del usuario autenticado
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
   *             required: [type, name, amount, weekStartDate]
   *             properties:
   *               type: { type: string, enum: [income, expense] }
   *               name: { type: string, maxLength: 150 }
   *               amount: { type: number, exclusiveMinimum: 0 }
   *               weekStartDate: { type: string, format: date }
   *     responses:
   *       201:
   *         description: Entrada creada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/MoneyEntry' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post('/entries', idempotency(idempotencyRepository, CREATE_ENTRY_ROUTE), validateBody(createMoneyEntrySchema), controller.createEntry);

  /**
   * @openapi
   * /api/finance/entries/{id}:
   *   patch:
   *     tags: [Finance]
   *     summary: Actualizar name/amount de una entrada propia del usuario autenticado
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
   *         description: Entrada actualizada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/MoneyEntry' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.patch('/entries/:id', validateBody(updateMoneyEntrySchema), controller.updateEntry);

  /**
   * @openapi
   * /api/finance/entries/{id}:
   *   delete:
   *     tags: [Finance]
   *     summary: Eliminar una entrada propia del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Entrada eliminada
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.delete('/entries/:id', controller.deleteEntry);

  /**
   * @openapi
   * /api/finance/debt-payments:
   *   post:
   *     tags: [Finance]
   *     summary: Registrar un abono a deuda en una semana del usuario autenticado
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
   *             required: [weekStartDate, amount]
   *             properties:
   *               weekStartDate: { type: string, format: date }
   *               amount: { type: number, exclusiveMinimum: 0 }
   *     responses:
   *       201:
   *         description: Abono registrado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id: { type: string, format: uuid }
   *                 weekStartDate: { type: string, format: date }
   *                 amount: { type: number }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/debt-payments',
    idempotency(idempotencyRepository, CREATE_DEBT_PAYMENT_ROUTE),
    validateBody(createDebtPaymentSchema),
    controller.createDebtPayment,
  );

  /**
   * @openapi
   * /api/finance/savings:
   *   post:
   *     tags: [Finance]
   *     summary: Registrar ahorro en una semana del usuario autenticado
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
   *             required: [weekStartDate, amount]
   *             properties:
   *               weekStartDate: { type: string, format: date }
   *               amount: { type: number, exclusiveMinimum: 0 }
   *     responses:
   *       201:
   *         description: Ahorro registrado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id: { type: string, format: uuid }
   *                 weekStartDate: { type: string, format: date }
   *                 amount: { type: number }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/savings',
    idempotency(idempotencyRepository, CREATE_SAVINGS_ROUTE),
    validateBody(createSavingsEntrySchema),
    controller.createSavings,
  );

  return router;
}
