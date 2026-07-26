import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { idempotency } from '../middlewares/idempotency.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { registerSchema, loginSchema, googleLoginSchema } from '../validators/auth.validators';

const REGISTER_ROUTE = 'auth:register';

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     PublicUser:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         email: { type: string, format: email }
 *         name: { type: string }
 *         createdAt: { type: string, format: date-time }
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user: { $ref: '#/components/schemas/PublicUser' }
 *         accessToken: { type: string }
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 */
export function authRoutes(controller: AuthController, idempotencyRepository: IdempotencyRepository): Router {
  const router = Router();

  /**
   * @openapi
   * /api/auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Registrar un nuevo usuario
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: false
   *         schema: { type: string }
   *         description: Si se envía, reintentos con la misma key y el mismo body devuelven la misma respuesta sin duplicar el registro.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, name]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *               name: { type: string, minLength: 1 }
   *     responses:
   *       201:
   *         description: Usuario creado. Además setea la cookie httpOnly `refresh_token`.
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/AuthResponse' }
   *       400:
   *         description: Body inválido
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   *       409:
   *         description: El email ya está registrado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  router.post(
    '/register',
    idempotency(idempotencyRepository, REGISTER_ROUTE),
    validateBody(registerSchema),
    controller.register,
  );

  /**
   * @openapi
   * /api/auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Iniciar sesión
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string }
   *     responses:
   *       200:
   *         description: Sesión iniciada. Además setea la cookie httpOnly `refresh_token`.
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/AuthResponse' }
   *       401:
   *         description: Credenciales inválidas (mensaje genérico, no distingue email inexistente de password incorrecto)
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  router.post('/login', validateBody(loginSchema), controller.login);

  /**
   * @openapi
   * /api/auth/google:
   *   post:
   *     tags: [Auth]
   *     summary: Iniciar sesión (o registrarse) con un ID token de Google Identity Services
   *     description: >
   *       Si el google_id ya existe, inicia sesión con esa cuenta. Si no existe pero el correo ya
   *       está registrado con password, vincula la cuenta automáticamente (Google ya verificó ese
   *       correo). Si el correo no existe, crea una cuenta nueva sin password.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [idToken]
   *             properties:
   *               idToken: { type: string, description: "Credential devuelto por Google Identity Services" }
   *     responses:
   *       200:
   *         description: Sesión iniciada. Además setea la cookie httpOnly `refresh_token`.
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/AuthResponse' }
   *       401:
   *         description: Token de Google inválido o correo no verificado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  router.post('/google', validateBody(googleLoginSchema), controller.google);

  /**
   * @openapi
   * /api/auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Emitir un nuevo access token a partir de la cookie refresh_token
   *     responses:
   *       200:
   *         description: Nuevo access token
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 accessToken: { type: string }
   *       401:
   *         description: Cookie refresh_token faltante, inválida o expirada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  router.post('/refresh', controller.refresh);

  /**
   * @openapi
   * /api/auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Cerrar sesión (limpia la cookie refresh_token)
   *     responses:
   *       204:
   *         description: Sesión cerrada
   */
  router.post('/logout', controller.logout);

  return router;
}
