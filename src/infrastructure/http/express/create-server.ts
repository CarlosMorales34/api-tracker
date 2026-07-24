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
import { ActivityCategoryController } from '../../../presentation/controllers/activity-category.controller';
import { ActivityController } from '../../../presentation/controllers/activity.controller';
import { FixedRoutineController } from '../../../presentation/controllers/fixed-routine.controller';
import { ActivityLogController } from '../../../presentation/controllers/activity-log.controller';
import { FinanceController } from '../../../presentation/controllers/finance.controller';
import { ExpensesController } from '../../../presentation/controllers/expenses.controller';
import { WeightController } from '../../../presentation/controllers/weight.controller';
import { WeeklyLogController } from '../../../presentation/controllers/weekly-log.controller';
import { HomeController } from '../../../presentation/controllers/home.controller';
import { errorHandler } from '../../../presentation/middlewares/error-handler.middleware';
import { authenticate } from '../../../presentation/middlewares/authenticate.middleware';
import { globalRateLimiter } from '../../../presentation/middlewares/rate-limiters.middleware';
import { MysqlMetricRepository } from '../../database/mysql/repositories/mysql-metric.repository';
import { MysqlMetricEntryRepository } from '../../database/mysql/repositories/mysql-metric-entry.repository';
import { MysqlUserRepository } from '../../database/mysql/repositories/mysql-user.repository';
import { MysqlIdempotencyRepository } from '../../database/mysql/repositories/mysql-idempotency.repository';
import { MysqlActivityCategoryRepository } from '../../database/mysql/repositories/mysql-activity-category.repository';
import { MysqlActivityRepository } from '../../database/mysql/repositories/mysql-activity.repository';
import { MysqlFixedRoutineRepository } from '../../database/mysql/repositories/mysql-fixed-routine.repository';
import { MysqlActivityLogRepository } from '../../database/mysql/repositories/mysql-activity-log.repository';
import { MysqlMoneyEntryRepository } from '../../database/mysql/repositories/mysql-money-entry.repository';
import { MysqlFinanceSettingsRepository } from '../../database/mysql/repositories/mysql-finance-settings.repository';
import { MysqlFinanceDebtPaymentRepository } from '../../database/mysql/repositories/mysql-finance-debt-payment.repository';
import { MysqlFinanceSavingsRepository } from '../../database/mysql/repositories/mysql-finance-savings.repository';
import { MysqlDailyExpenseRepository } from '../../database/mysql/repositories/mysql-daily-expense.repository';
import { MysqlFixedMonthlyExpenseRepository } from '../../database/mysql/repositories/mysql-fixed-monthly-expense.repository';
import { MysqlWeightEntryRepository } from '../../database/mysql/repositories/mysql-weight-entry.repository';
import { MysqlWeightSettingsRepository } from '../../database/mysql/repositories/mysql-weight-settings.repository';
import { MysqlAnnualCounterRepository } from '../../database/mysql/repositories/mysql-annual-counter.repository';
import { MysqlWeekNoteRepository } from '../../database/mysql/repositories/mysql-week-note.repository';
import { MysqlProductivitySettingsRepository } from '../../database/mysql/repositories/mysql-productivity-settings.repository';
import { CreateMetricUseCase } from '../../../application/use-cases/metric/create-metric.use-case';
import { ListMetricsUseCase } from '../../../application/use-cases/metric/list-metrics.use-case';
import { LogMetricEntryUseCase } from '../../../application/use-cases/metric-entry/log-metric-entry.use-case';
import { GetMetricHistoryUseCase } from '../../../application/use-cases/metric-entry/get-metric-history.use-case';
import { CreateActivityCategoryUseCase } from '../../../application/use-cases/activity-category/create-activity-category.use-case';
import { ListActivityCategoriesUseCase } from '../../../application/use-cases/activity-category/list-activity-categories.use-case';
import { CreateActivityUseCase } from '../../../application/use-cases/activity/create-activity.use-case';
import { ListActivitiesUseCase } from '../../../application/use-cases/activity/list-activities.use-case';
import { CreateFixedRoutineUseCase } from '../../../application/use-cases/fixed-routine/create-fixed-routine.use-case';
import { ListFixedRoutinesUseCase } from '../../../application/use-cases/fixed-routine/list-fixed-routines.use-case';
import { DeleteFixedRoutineUseCase } from '../../../application/use-cases/fixed-routine/delete-fixed-routine.use-case';
import { ListActivityLogsUseCase } from '../../../application/use-cases/activity-log/list-activity-logs.use-case';
import { GetFinanceSettingsUseCase } from '../../../application/use-cases/finance/get-finance-settings.use-case';
import { UpdateFinanceSettingsUseCase } from '../../../application/use-cases/finance/update-finance-settings.use-case';
import { GetFinanceWeekSummaryUseCase } from '../../../application/use-cases/finance/get-finance-week-summary.use-case';
import { CreateMoneyEntryUseCase } from '../../../application/use-cases/finance/create-money-entry.use-case';
import { UpdateMoneyEntryUseCase } from '../../../application/use-cases/finance/update-money-entry.use-case';
import { DeleteMoneyEntryUseCase } from '../../../application/use-cases/finance/delete-money-entry.use-case';
import { CreateDebtPaymentUseCase } from '../../../application/use-cases/finance/create-debt-payment.use-case';
import { CreateSavingsEntryUseCase } from '../../../application/use-cases/finance/create-savings-entry.use-case';
import { ListDailyExpensesUseCase } from '../../../application/use-cases/expenses/list-daily-expenses.use-case';
import { CreateDailyExpenseUseCase } from '../../../application/use-cases/expenses/create-daily-expense.use-case';
import { UpdateDailyExpenseUseCase } from '../../../application/use-cases/expenses/update-daily-expense.use-case';
import { DeleteDailyExpenseUseCase } from '../../../application/use-cases/expenses/delete-daily-expense.use-case';
import { ListFixedExpensesUseCase } from '../../../application/use-cases/expenses/list-fixed-expenses.use-case';
import { CreateFixedExpenseUseCase } from '../../../application/use-cases/expenses/create-fixed-expense.use-case';
import { UpdateFixedExpenseUseCase } from '../../../application/use-cases/expenses/update-fixed-expense.use-case';
import { DeleteFixedExpenseUseCase } from '../../../application/use-cases/expenses/delete-fixed-expense.use-case';
import { GetExpensesSummaryUseCase } from '../../../application/use-cases/expenses/get-expenses-summary.use-case';
import { GetWeightYearUseCase } from '../../../application/use-cases/weight/get-weight-year.use-case';
import { PutWeightMonthUseCase } from '../../../application/use-cases/weight/put-weight-month.use-case';
import { PutWeightMonthNoteUseCase } from '../../../application/use-cases/weight/put-weight-month-note.use-case';
import { GetWeightSettingsUseCase } from '../../../application/use-cases/weight/get-weight-settings.use-case';
import { PutWeightSettingsUseCase } from '../../../application/use-cases/weight/put-weight-settings.use-case';
import { GetWeightYearlyExtremesUseCase } from '../../../application/use-cases/weight/get-weight-yearly-extremes.use-case';
import { GetWeeklyLogYearUseCase } from '../../../application/use-cases/weekly-log/get-weekly-log-year.use-case';
import { GetWeeklyLogWeekUseCase } from '../../../application/use-cases/weekly-log/get-weekly-log-week.use-case';
import { GetHomeSummaryUseCase } from '../../../application/use-cases/home/get-home-summary.use-case';
import { PutWeekNotesUseCase } from '../../../application/use-cases/weekly-log/put-week-notes.use-case';
import { ListAnnualCountersUseCase } from '../../../application/use-cases/weekly-log/list-annual-counters.use-case';
import { CreateAnnualCounterUseCase } from '../../../application/use-cases/weekly-log/create-annual-counter.use-case';
import { DeleteAnnualCounterUseCase } from '../../../application/use-cases/weekly-log/delete-annual-counter.use-case';
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
  const activityCategoryRepository = new MysqlActivityCategoryRepository(pool);
  const activityRepository = new MysqlActivityRepository(pool);
  const fixedRoutineRepository = new MysqlFixedRoutineRepository(pool);
  const activityLogRepository = new MysqlActivityLogRepository(pool);
  const moneyEntryRepository = new MysqlMoneyEntryRepository(pool);
  const financeSettingsRepository = new MysqlFinanceSettingsRepository(pool);
  const financeDebtPaymentRepository = new MysqlFinanceDebtPaymentRepository(pool);
  const financeSavingsRepository = new MysqlFinanceSavingsRepository(pool);
  const dailyExpenseRepository = new MysqlDailyExpenseRepository(pool);
  const fixedMonthlyExpenseRepository = new MysqlFixedMonthlyExpenseRepository(pool);
  const weightEntryRepository = new MysqlWeightEntryRepository(pool);
  const weightSettingsRepository = new MysqlWeightSettingsRepository(pool);
  const annualCounterRepository = new MysqlAnnualCounterRepository(pool);
  const weekNoteRepository = new MysqlWeekNoteRepository(pool);
  const productivitySettingsRepository = new MysqlProductivitySettingsRepository(pool);

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

  const createActivityCategoryUseCase = new CreateActivityCategoryUseCase(activityCategoryRepository);
  const listActivityCategoriesUseCase = new ListActivityCategoriesUseCase(activityCategoryRepository);
  const createActivityUseCase = new CreateActivityUseCase(activityCategoryRepository, activityRepository);
  const listActivitiesUseCase = new ListActivitiesUseCase(activityCategoryRepository, activityRepository);
  const createFixedRoutineUseCase = new CreateFixedRoutineUseCase(fixedRoutineRepository);
  const listFixedRoutinesUseCase = new ListFixedRoutinesUseCase(fixedRoutineRepository);
  const deleteFixedRoutineUseCase = new DeleteFixedRoutineUseCase(fixedRoutineRepository);

  const listActivityLogsUseCase = new ListActivityLogsUseCase(activityLogRepository);

  const getFinanceSettingsUseCase = new GetFinanceSettingsUseCase(financeSettingsRepository);
  const updateFinanceSettingsUseCase = new UpdateFinanceSettingsUseCase(financeSettingsRepository);
  const getFinanceWeekSummaryUseCase = new GetFinanceWeekSummaryUseCase(
    moneyEntryRepository,
    financeSettingsRepository,
    financeDebtPaymentRepository,
    financeSavingsRepository,
  );
  const createMoneyEntryUseCase = new CreateMoneyEntryUseCase(moneyEntryRepository);
  const updateMoneyEntryUseCase = new UpdateMoneyEntryUseCase(moneyEntryRepository);
  const deleteMoneyEntryUseCase = new DeleteMoneyEntryUseCase(moneyEntryRepository);
  const createDebtPaymentUseCase = new CreateDebtPaymentUseCase(financeDebtPaymentRepository);
  const createSavingsEntryUseCase = new CreateSavingsEntryUseCase(financeSavingsRepository);

  const listDailyExpensesUseCase = new ListDailyExpensesUseCase(dailyExpenseRepository);
  const createDailyExpenseUseCase = new CreateDailyExpenseUseCase(dailyExpenseRepository);
  const updateDailyExpenseUseCase = new UpdateDailyExpenseUseCase(dailyExpenseRepository);
  const deleteDailyExpenseUseCase = new DeleteDailyExpenseUseCase(dailyExpenseRepository);
  const listFixedExpensesUseCase = new ListFixedExpensesUseCase(fixedMonthlyExpenseRepository);
  const createFixedExpenseUseCase = new CreateFixedExpenseUseCase(fixedMonthlyExpenseRepository);
  const updateFixedExpenseUseCase = new UpdateFixedExpenseUseCase(fixedMonthlyExpenseRepository);
  const deleteFixedExpenseUseCase = new DeleteFixedExpenseUseCase(fixedMonthlyExpenseRepository);
  const getExpensesSummaryUseCase = new GetExpensesSummaryUseCase(
    moneyEntryRepository,
    dailyExpenseRepository,
    fixedMonthlyExpenseRepository,
    financeSettingsRepository,
  );

  const getWeightYearUseCase = new GetWeightYearUseCase(weightEntryRepository, weightSettingsRepository);
  const putWeightMonthUseCase = new PutWeightMonthUseCase(weightEntryRepository);
  const putWeightMonthNoteUseCase = new PutWeightMonthNoteUseCase(weightEntryRepository);
  const getWeightSettingsUseCase = new GetWeightSettingsUseCase(weightSettingsRepository);
  const putWeightSettingsUseCase = new PutWeightSettingsUseCase(weightSettingsRepository);
  const getWeightYearlyExtremesUseCase = new GetWeightYearlyExtremesUseCase(weightEntryRepository, weightSettingsRepository);

  const getWeeklyLogYearUseCase = new GetWeeklyLogYearUseCase(activityLogRepository, productivitySettingsRepository);
  const getWeeklyLogWeekUseCase = new GetWeeklyLogWeekUseCase(
    activityLogRepository,
    productivitySettingsRepository,
    weekNoteRepository,
  );
  const putWeekNotesUseCase = new PutWeekNotesUseCase(weekNoteRepository);
  const listAnnualCountersUseCase = new ListAnnualCountersUseCase(annualCounterRepository);
  const createAnnualCounterUseCase = new CreateAnnualCounterUseCase(annualCounterRepository);
  const deleteAnnualCounterUseCase = new DeleteAnnualCounterUseCase(annualCounterRepository);

  const getHomeSummaryUseCase = new GetHomeSummaryUseCase(
    activityLogRepository,
    getWeeklyLogWeekUseCase,
    moneyEntryRepository,
    weightEntryRepository,
    weightSettingsRepository,
  );

  // --- Controllers ---
  const authController = new AuthController(registerUserUseCase, loginUserUseCase, refreshAccessTokenUseCase);
  const metricController = new MetricController(createMetricUseCase, listMetricsUseCase);
  const metricEntryController = new MetricEntryController(logMetricEntryUseCase, getMetricHistoryUseCase);
  const activityCategoryController = new ActivityCategoryController(
    createActivityCategoryUseCase,
    listActivityCategoriesUseCase,
  );
  const activityController = new ActivityController(createActivityUseCase, listActivitiesUseCase);
  const fixedRoutineController = new FixedRoutineController(
    createFixedRoutineUseCase,
    listFixedRoutinesUseCase,
    deleteFixedRoutineUseCase,
  );
  const activityLogController = new ActivityLogController(listActivityLogsUseCase);
  const financeController = new FinanceController(
    getFinanceSettingsUseCase,
    updateFinanceSettingsUseCase,
    getFinanceWeekSummaryUseCase,
    createMoneyEntryUseCase,
    updateMoneyEntryUseCase,
    deleteMoneyEntryUseCase,
    createDebtPaymentUseCase,
    createSavingsEntryUseCase,
  );
  const expensesController = new ExpensesController(
    listDailyExpensesUseCase,
    createDailyExpenseUseCase,
    updateDailyExpenseUseCase,
    deleteDailyExpenseUseCase,
    listFixedExpensesUseCase,
    createFixedExpenseUseCase,
    updateFixedExpenseUseCase,
    deleteFixedExpenseUseCase,
    getExpensesSummaryUseCase,
  );
  const weightController = new WeightController(
    getWeightYearUseCase,
    putWeightMonthUseCase,
    putWeightMonthNoteUseCase,
    getWeightSettingsUseCase,
    putWeightSettingsUseCase,
    getWeightYearlyExtremesUseCase,
  );
  const weeklyLogController = new WeeklyLogController(
    getWeeklyLogYearUseCase,
    getWeeklyLogWeekUseCase,
    putWeekNotesUseCase,
    listAnnualCountersUseCase,
    createAnnualCounterUseCase,
    deleteAnnualCounterUseCase,
  );
  const homeController = new HomeController(getHomeSummaryUseCase);

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
      activityCategoryController,
      activityController,
      fixedRoutineController,
      activityLogController,
      financeController,
      expensesController,
      weightController,
      weeklyLogController,
      homeController,
      authenticateMiddleware,
      idempotencyRepository,
    }),
  );

  app.use(errorHandler);

  return app;
}
