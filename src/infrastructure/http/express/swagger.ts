import path from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../../config/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'vitalis API',
      version: '0.1.0',
      description:
        'API de vitalis — auto-seguimiento de métricas personales. ' +
        'Autenticación JWT (access + refresh), idempotencia vía header ' +
        '`Idempotency-Key`, y rate limiting.',
    },
    servers: [{ url: `http://localhost:${env.port}`, description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  // Covers both `npm run dev` (tsx reads .ts directly) and the compiled
  // `dist/` build (plain .js), since the JSDoc @openapi blocks live in the
  // route files themselves.
  apis: [
    path.join(__dirname, '../../../presentation/routes/*.ts'),
    path.join(__dirname, '../../../presentation/routes/*.js'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
