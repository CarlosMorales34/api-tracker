import { Router, RequestHandler } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { updateUserModulesSchema } from '../validators/user.validators';

/**
 * @openapi
 * components:
 *   schemas:
 *     UserModuleSettings:
 *       type: object
 *       properties:
 *         hasActivities: { type: boolean }
 *         hasFinance: { type: boolean }
 *         hasHealth: { type: boolean }
 */
export function userRoutes(controller: UserController, authenticateMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authenticateMiddleware);

  /**
   * @openapi
   * /api/users/modules:
   *   get:
   *     tags: [Users]
   *     summary: Dominios habilitados (Actividades/Finanzas/Salud) del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Dominios habilitados
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/UserModuleSettings' }
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.get('/modules', controller.getModules);

  /**
   * @openapi
   * /api/users/modules:
   *   put:
   *     tags: [Users]
   *     summary: Cambiar los dominios habilitados del usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/UserModuleSettings' }
   *     responses:
   *       200:
   *         description: Dominios actualizados
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/UserModuleSettings' }
   *       400:
   *         description: Body inválido, o intentaste deshabilitar los 3 dominios
   *       401:
   *         description: Access token faltante, inválido o expirado
   */
  router.put('/modules', validateBody(updateUserModulesSchema), controller.updateModules);

  return router;
}
