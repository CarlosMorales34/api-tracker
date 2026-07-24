import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { MetricController } from '../controllers/metric.controller';
import { MetricEntryController } from '../controllers/metric-entry.controller';
import { ActivityCategoryController } from '../controllers/activity-category.controller';
import { ActivityController } from '../controllers/activity.controller';
import { FixedRoutineController } from '../controllers/fixed-routine.controller';
import { ActivityLogController } from '../controllers/activity-log.controller';
import { FinanceController } from '../controllers/finance.controller';
import { ExpensesController } from '../controllers/expenses.controller';
import { WeightController } from '../controllers/weight.controller';
import { WeeklyLogController } from '../controllers/weekly-log.controller';
import { HomeController } from '../controllers/home.controller';
import { IdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { authRateLimiter } from '../middlewares/rate-limiters.middleware';
import { authRoutes } from './auth.routes';
import { metricRoutes } from './metric.routes';
import { metricEntryRoutes } from './metric-entry.routes';
import { activityCategoryRoutes } from './activity-category.routes';
import { activityRoutes } from './activity.routes';
import { fixedRoutineRoutes } from './fixed-routine.routes';
import { activityLogRoutes } from './activity-log.routes';
import { financeRoutes } from './finance.routes';
import { expensesRoutes } from './expenses.routes';
import { weightRoutes } from './weight.routes';
import { weeklyLogRoutes } from './weekly-log.routes';
import { homeRoutes } from './home.routes';

export interface ApiRoutesDeps {
  authController: AuthController;
  metricController: MetricController;
  metricEntryController: MetricEntryController;
  activityCategoryController: ActivityCategoryController;
  activityController: ActivityController;
  fixedRoutineController: FixedRoutineController;
  activityLogController: ActivityLogController;
  financeController: FinanceController;
  expensesController: ExpensesController;
  weightController: WeightController;
  weeklyLogController: WeeklyLogController;
  homeController: HomeController;
  authenticateMiddleware: RequestHandler;
  idempotencyRepository: IdempotencyRepository;
}

export function apiRoutes(deps: ApiRoutesDeps): Router {
  const router = Router();

  router.use('/auth', authRateLimiter, authRoutes(deps.authController, deps.idempotencyRepository));
  router.use('/metrics', metricRoutes(deps.metricController, deps.authenticateMiddleware, deps.idempotencyRepository));
  router.use(
    '/metric-entries',
    metricEntryRoutes(deps.metricEntryController, deps.authenticateMiddleware, deps.idempotencyRepository),
  );
  router.use(
    '/activity-categories',
    activityCategoryRoutes(deps.activityCategoryController, deps.authenticateMiddleware, deps.idempotencyRepository),
  );
  router.use(
    '/activities',
    activityRoutes(deps.activityController, deps.authenticateMiddleware, deps.idempotencyRepository),
  );
  router.use(
    '/fixed-routines',
    fixedRoutineRoutes(deps.fixedRoutineController, deps.authenticateMiddleware, deps.idempotencyRepository),
  );
  router.use('/activity-logs', activityLogRoutes(deps.activityLogController, deps.authenticateMiddleware));
  router.use(
    '/finance',
    financeRoutes(deps.financeController, deps.authenticateMiddleware, deps.idempotencyRepository),
  );
  router.use(
    '/expenses',
    expensesRoutes(deps.expensesController, deps.authenticateMiddleware, deps.idempotencyRepository),
  );
  router.use('/weight', weightRoutes(deps.weightController, deps.authenticateMiddleware));
  router.use(
    '/weekly-log',
    weeklyLogRoutes(deps.weeklyLogController, deps.authenticateMiddleware, deps.idempotencyRepository),
  );
  router.use('/home', homeRoutes(deps.homeController, deps.authenticateMiddleware));

  return router;
}
