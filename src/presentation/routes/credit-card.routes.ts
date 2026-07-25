import { Router, RequestHandler } from 'express';
import { CreditCardController } from '../controllers/credit-card.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createCreditCardSchema, updateCreditCardSchema } from '../validators/credit-card.validators';

const CREATE_CREDIT_CARD_ROUTE = 'credit-cards:create';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreditCard:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         creditLimit: { type: number }
 *         dueDay:
 *           type: integer
 *           description: Día del mes (1-31) en que vence el pago.
 *         amountOwed: { type: number }
 *         available:
 *           type: number
 *           description: creditLimit - amountOwed (calculado).
 */
export function creditCardRoutes(
  controller: CreditCardController,
  authenticateMiddleware: RequestHandler,
  idempotencyRepository: IdempotencyRepository,
): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/credit-cards:
   *   post:
   *     tags: [Credit Cards]
   *     summary: Crear una tarjeta de crédito del usuario autenticado
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
   *             required: [name, creditLimit, dueDay]
   *             properties:
   *               name: { type: string, maxLength: 150 }
   *               creditLimit: { type: number, exclusiveMinimum: 0 }
   *               dueDay: { type: integer, minimum: 1, maximum: 31 }
   *               amountOwed: { type: number, minimum: 0 }
   *     responses:
   *       201:
   *         description: Tarjeta creada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/CreditCard' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.post(
    '/',
    idempotency(idempotencyRepository, CREATE_CREDIT_CARD_ROUTE),
    validateBody(createCreditCardSchema),
    controller.create,
  );

  /**
   * @openapi
   * /api/credit-cards:
   *   get:
   *     tags: [Credit Cards]
   *     summary: Listar las tarjetas de crédito del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Tarjetas del usuario
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/CreditCard' } }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/', controller.list);

  /**
   * @openapi
   * /api/credit-cards/{id}:
   *   patch:
   *     tags: [Credit Cards]
   *     summary: Actualizar una tarjeta de crédito propia del usuario autenticado
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
   *               creditLimit: { type: number, exclusiveMinimum: 0 }
   *               dueDay: { type: integer, minimum: 1, maximum: 31 }
   *               amountOwed: { type: number, minimum: 0 }
   *     responses:
   *       200:
   *         description: Tarjeta actualizada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/CreditCard' }
   *       400:
   *         description: Body inválido
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.patch('/:id', validateBody(updateCreditCardSchema), controller.update);

  /**
   * @openapi
   * /api/credit-cards/{id}:
   *   delete:
   *     tags: [Credit Cards]
   *     summary: Eliminar una tarjeta de crédito propia del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Tarjeta eliminada
   *       401:
   *         description: Access token faltante, inválido o expirado
   *       404:
   *         description: id no existe o no pertenece al usuario autenticado
   */
  router.delete('/:id', controller.remove);

  return router;
}
