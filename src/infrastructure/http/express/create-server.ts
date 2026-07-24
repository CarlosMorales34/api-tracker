import express, { Express } from 'express';
import { Pool } from 'mysql2/promise';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import timeout from 'connect-timeout';
import swaggerUi from 'swagger-ui-express';
import { apiRoutes } from '../../../presentation/routes';
import { AuthController } from '../../../presentation/controllers/auth.controller';
import { MetricController } from '../../../presentation/controllers/metric.controller';
import { MetricEntryController } from '../../../presentation/controllers/metric-entry.controller';
import { errorHandler } from '../../../presentation/middlewares/error-handler.middleware';
import { authenticate } from '../../../presentation/middlewares/authenticate.middleware';
import { globalRateLimiter } from '../../../presentation/middlewares/rate-limiters.middleware';
import { MysqlMetricRepository } from '../../database/mysql/repositories/mysql-metric.repository';
import { MysqlMetricEntryRepository } from '../../database/mysql/repositories/mysql-metric-entry.repository';
import { MysqlUserRepository } from '../../database/mysql/repositories/mysql-user.repository';
import { MysqlIdempotencyRepository } from '../../database/mysql/repositories/mysql-idempotency.repository';
import { CreateMetricUseCase } from '../../../application/use-cases/metric/create-metric.use-case';
import { ListMetricsUseCase } from '../../../application/use-cases/metric/list-metrics.use-case';
import { LogMetricEntryUseCase } from '../../../application/use-cases/metric-entry/log-metric-entry.use-case';
import { GetMetricHistoryUseCase } from '../../../application/use-cases/metric-entry/get-metric-history.use-case';
import { RegisterUserUseCase } from '../../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../../application/use-cases/auth/login-user.use-case';
import { RefreshAccessTokenUseCase } from '../../../application/use-cases/auth/refresh-access-token.use-case';
import { BcryptPasswordHasher } from '../../security/bcrypt-password-hasher.service';
import { JwtTokenService } from '../../security/jwt-token.service';
import { env } from '../../config/env';
import { swaggerSpec } from './swagger';

const REQUEST_TIMEOUT = '10s';

// Express 5 forwards rejected promises from async handlers to errorHandler automatically.
export function createServer(pool: Pool): Express {
  // --- Repositories (infrastructure implementations of domain contracts) ---
  const metricRepository = new MysqlMetricRepository(pool);
  const metricEntryRepository = new MysqlMetricEntryRepository(pool);
  const userRepository = new MysqlUserRepository(pool);
  const idempotencyRepository = new MysqlIdempotencyRepository(pool);

  // --- Security services ---
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(env.jwt.secret, env.jwt.expiresIn, env.jwt.refreshExpiresIn);

  // --- Use cases ---
  const registerUserUseCase = new RegisterUserUseCase(userRepository, passwordHasher, tokenService);
  const loginUserUseCase = new LoginUserUseCase(userRepository, passwordHasher, tokenService);
  const refreshAccessTokenUseCase = new RefreshAccessTokenUseCase(tokenService);

  const createMetricUseCase = new CreateMetricUseCase(metricRepository);
  const listMetricsUseCase = new ListMetricsUseCase(metricRepository);
  const logMetricEntryUseCase = new LogMetricEntryUseCase(metricRepository, metricEntryRepository);
  const getMetricHistoryUseCase = new GetMetricHistoryUseCase(metricRepository, metricEntryRepository);

  // --- Controllers ---
  const authController = new AuthController(registerUserUseCase, loginUserUseCase, refreshAccessTokenUseCase);
  const metricController = new MetricController(createMetricUseCase, listMetricsUseCase);
  const metricEntryController = new MetricEntryController(logMetricEntryUseCase, getMetricHistoryUseCase);

  // --- Cross-cutting middlewares ---
  const authenticateMiddleware = authenticate(tokenService);

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(compression());

  // Fail fast instead of piling up hung connections under load.
  app.use(timeout(REQUEST_TIMEOUT));
  app.use((req, _res, next) => {
    if (!req.timedout) next();
  });

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/docs.json', (_req, res) => res.status(200).json(swaggerSpec));

  app.use('/api', globalRateLimiter);
  app.use(
    '/api',
    apiRoutes({
      authController,
      metricController,
      metricEntryController,
      authenticateMiddleware,
      idempotencyRepository,
    }),
  );

  app.use(errorHandler);

  return app;
}
