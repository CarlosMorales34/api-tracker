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
import { CreditCardController } from '../../../presentation/controllers/credit-card.controller';
import { WeightController } from '../../../presentation/controllers/weight.controller';
import { WorkoutController } from '../../../presentation/controllers/workout.controller';
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
import { MysqlRoutineLogRepository } from '../../database/mysql/repositories/mysql-routine-log.repository';
import { MysqlActivityLogRepository } from '../../database/mysql/repositories/mysql-activity-log.repository';
import { MysqlMoneyEntryRepository } from '../../database/mysql/repositories/mysql-money-entry.repository';
import { MysqlFinanceSettingsRepository } from '../../database/mysql/repositories/mysql-finance-settings.repository';
import { MysqlFinanceDebtPaymentRepository } from '../../database/mysql/repositories/mysql-finance-debt-payment.repository';
import { MysqlFinanceSavingsRepository } from '../../database/mysql/repositories/mysql-finance-savings.repository';
import { MysqlFinanceAnnualIncomeRepository } from '../../database/mysql/repositories/mysql-finance-annual-income.repository';
import { MysqlDailyExpenseRepository } from '../../database/mysql/repositories/mysql-daily-expense.repository';
import { MysqlFixedMonthlyExpenseRepository } from '../../database/mysql/repositories/mysql-fixed-monthly-expense.repository';
import { MysqlFixedExpenseChargeRepository } from '../../database/mysql/repositories/mysql-fixed-expense-charge.repository';
import { MysqlCreditCardRepository } from '../../database/mysql/repositories/mysql-credit-card.repository';
import { MysqlWeightEntryRepository } from '../../database/mysql/repositories/mysql-weight-entry.repository';
import { MysqlWeightSettingsRepository } from '../../database/mysql/repositories/mysql-weight-settings.repository';
import { MysqlAnnualCounterRepository } from '../../database/mysql/repositories/mysql-annual-counter.repository';
import { MysqlWeekNoteRepository } from '../../database/mysql/repositories/mysql-week-note.repository';
import { MysqlProductivitySettingsRepository } from '../../database/mysql/repositories/mysql-productivity-settings.repository';
import { MysqlWorkoutRepository } from '../../database/mysql/repositories/mysql-workout.repository';
import { CreateMetricUseCase } from '../../../application/use-cases/metric/create-metric.use-case';
import { ListMetricsUseCase } from '../../../application/use-cases/metric/list-metrics.use-case';
import { LogMetricEntryUseCase } from '../../../application/use-cases/metric-entry/log-metric-entry.use-case';
import { GetMetricHistoryUseCase } from '../../../application/use-cases/metric-entry/get-metric-history.use-case';
import { CreateActivityCategoryUseCase } from '../../../application/use-cases/activity-category/create-activity-category.use-case';
import { ListActivityCategoriesUseCase } from '../../../application/use-cases/activity-category/list-activity-categories.use-case';
import { ReorderActivityCategoriesUseCase } from '../../../application/use-cases/activity-category/reorder-activity-categories.use-case';
import { CreateActivityUseCase } from '../../../application/use-cases/activity/create-activity.use-case';
import { ListActivitiesUseCase } from '../../../application/use-cases/activity/list-activities.use-case';
import { ListActivitiesForDateUseCase } from '../../../application/use-cases/activity/list-activities-for-date.use-case';
import { ReorderActivitiesUseCase } from '../../../application/use-cases/activity/reorder-activities.use-case';
import { PutActivityLogUseCase } from '../../../application/use-cases/activity-log/put-activity-log.use-case';
import { CreateFixedRoutineUseCase } from '../../../application/use-cases/fixed-routine/create-fixed-routine.use-case';
import { ListFixedRoutinesUseCase } from '../../../application/use-cases/fixed-routine/list-fixed-routines.use-case';
import { ListFixedRoutinesForDateUseCase } from '../../../application/use-cases/fixed-routine/list-fixed-routines-for-date.use-case';
import { DeleteFixedRoutineUseCase } from '../../../application/use-cases/fixed-routine/delete-fixed-routine.use-case';
import { PutRoutineLogUseCase } from '../../../application/use-cases/fixed-routine/put-routine-log.use-case';
import { UpdateFixedRoutineUseCase } from '../../../application/use-cases/fixed-routine/update-fixed-routine.use-case';
import { ListActivityLogsUseCase } from '../../../application/use-cases/activity-log/list-activity-logs.use-case';
import { GetFinanceSettingsUseCase } from '../../../application/use-cases/finance/get-finance-settings.use-case';
import { UpdateFinanceSettingsUseCase } from '../../../application/use-cases/finance/update-finance-settings.use-case';
import { GetFinanceWeekSummaryUseCase } from '../../../application/use-cases/finance/get-finance-week-summary.use-case';
import { CreateMoneyEntryUseCase } from '../../../application/use-cases/finance/create-money-entry.use-case';
import { UpdateMoneyEntryUseCase } from '../../../application/use-cases/finance/update-money-entry.use-case';
import { DeleteMoneyEntryUseCase } from '../../../application/use-cases/finance/delete-money-entry.use-case';
import { CreateDebtPaymentUseCase } from '../../../application/use-cases/finance/create-debt-payment.use-case';
import { CreateSavingsEntryUseCase } from '../../../application/use-cases/finance/create-savings-entry.use-case';
import { ListFinanceAnnualIncomeUseCase } from '../../../application/use-cases/finance/list-finance-annual-income.use-case';
import { UpsertFinanceAnnualIncomeUseCase } from '../../../application/use-cases/finance/upsert-finance-annual-income.use-case';
import { DeleteFinanceAnnualIncomeUseCase } from '../../../application/use-cases/finance/delete-finance-annual-income.use-case';
import { ListDailyExpensesUseCase } from '../../../application/use-cases/expenses/list-daily-expenses.use-case';
import { CreateDailyExpenseUseCase } from '../../../application/use-cases/expenses/create-daily-expense.use-case';
import { UpdateDailyExpenseUseCase } from '../../../application/use-cases/expenses/update-daily-expense.use-case';
import { DeleteDailyExpenseUseCase } from '../../../application/use-cases/expenses/delete-daily-expense.use-case';
import { ListFixedExpensesUseCase } from '../../../application/use-cases/expenses/list-fixed-expenses.use-case';
import { CreateFixedExpenseUseCase } from '../../../application/use-cases/expenses/create-fixed-expense.use-case';
import { UpdateFixedExpenseUseCase } from '../../../application/use-cases/expenses/update-fixed-expense.use-case';
import { DeleteFixedExpenseUseCase } from '../../../application/use-cases/expenses/delete-fixed-expense.use-case';
import { GetExpensesSummaryUseCase } from '../../../application/use-cases/expenses/get-expenses-summary.use-case';
import { CreateCreditCardUseCase } from '../../../application/use-cases/credit-card/create-credit-card.use-case';
import { ListCreditCardsUseCase } from '../../../application/use-cases/credit-card/list-credit-cards.use-case';
import { UpdateCreditCardUseCase } from '../../../application/use-cases/credit-card/update-credit-card.use-case';
import { DeleteCreditCardUseCase } from '../../../application/use-cases/credit-card/delete-credit-card.use-case';
import { SetWalletBalanceUseCase } from '../../../application/use-cases/finance/set-wallet-balance.use-case';
import { GetWeightYearUseCase } from '../../../application/use-cases/weight/get-weight-year.use-case';
import { PutWeightMonthUseCase } from '../../../application/use-cases/weight/put-weight-month.use-case';
import { PutWeightMonthNoteUseCase } from '../../../application/use-cases/weight/put-weight-month-note.use-case';
import { GetWeightSettingsUseCase } from '../../../application/use-cases/weight/get-weight-settings.use-case';
import { PutWeightSettingsUseCase } from '../../../application/use-cases/weight/put-weight-settings.use-case';
import { GetWeightYearlyExtremesUseCase } from '../../../application/use-cases/weight/get-weight-yearly-extremes.use-case';
import { GetWeeklyLogYearUseCase } from '../../../application/use-cases/weekly-log/get-weekly-log-year.use-case';
import { GetWeeklyLogWeekUseCase } from '../../../application/use-cases/weekly-log/get-weekly-log-week.use-case';
import { GetHomeSummaryUseCase } from '../../../application/use-cases/home/get-home-summary.use-case';
import { CreateWorkoutUseCase } from '../../../application/use-cases/workout/create-workout.use-case';
import { ListWorkoutsForWeekUseCase } from '../../../application/use-cases/workout/list-workouts-for-week.use-case';
import { DeleteWorkoutUseCase } from '../../../application/use-cases/workout/delete-workout.use-case';
import { GetWorkoutPerformanceUseCase } from '../../../application/use-cases/workout/get-workout-performance.use-case';
import { PutWeekNotesUseCase } from '../../../application/use-cases/weekly-log/put-week-notes.use-case';
import { ListAnnualCountersUseCase } from '../../../application/use-cases/weekly-log/list-annual-counters.use-case';
import { CreateAnnualCounterUseCase } from '../../../application/use-cases/weekly-log/create-annual-counter.use-case';
import { DeleteAnnualCounterUseCase } from '../../../application/use-cases/weekly-log/delete-annual-counter.use-case';
import { RegisterUserUseCase } from '../../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../../application/use-cases/auth/login-user.use-case';
import { LoginWithGoogleUseCase } from '../../../application/use-cases/auth/login-with-google.use-case';
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
  const routineLogRepository = new MysqlRoutineLogRepository(pool);
  const activityLogRepository = new MysqlActivityLogRepository(pool);
  const moneyEntryRepository = new MysqlMoneyEntryRepository(pool);
  const financeSettingsRepository = new MysqlFinanceSettingsRepository(pool);
  const financeDebtPaymentRepository = new MysqlFinanceDebtPaymentRepository(pool);
  const financeSavingsRepository = new MysqlFinanceSavingsRepository(pool);
  const financeAnnualIncomeRepository = new MysqlFinanceAnnualIncomeRepository(pool);
  const dailyExpenseRepository = new MysqlDailyExpenseRepository(pool);
  const fixedMonthlyExpenseRepository = new MysqlFixedMonthlyExpenseRepository(pool);
  const fixedExpenseChargeRepository = new MysqlFixedExpenseChargeRepository(pool);
  const creditCardRepository = new MysqlCreditCardRepository(pool);
  const weightEntryRepository = new MysqlWeightEntryRepository(pool);
  const weightSettingsRepository = new MysqlWeightSettingsRepository(pool);
  const annualCounterRepository = new MysqlAnnualCounterRepository(pool);
  const weekNoteRepository = new MysqlWeekNoteRepository(pool);
  const productivitySettingsRepository = new MysqlProductivitySettingsRepository(pool);
  const workoutRepository = new MysqlWorkoutRepository(pool);

  // --- Security services ---
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(env.jwt.secret, env.jwt.expiresIn, env.jwt.refreshExpiresIn);

  // --- Use cases ---
  const registerUserUseCase = new RegisterUserUseCase(userRepository, passwordHasher, tokenService);
  const loginUserUseCase = new LoginUserUseCase(userRepository, passwordHasher, tokenService);
  const loginWithGoogleUseCase = new LoginWithGoogleUseCase(userRepository, tokenService, env.google.clientId);
  const refreshAccessTokenUseCase = new RefreshAccessTokenUseCase(tokenService);

  const createMetricUseCase = new CreateMetricUseCase(metricRepository);
  const listMetricsUseCase = new ListMetricsUseCase(metricRepository);
  const logMetricEntryUseCase = new LogMetricEntryUseCase(metricRepository, metricEntryRepository);
  const getMetricHistoryUseCase = new GetMetricHistoryUseCase(metricRepository, metricEntryRepository);

  const createActivityCategoryUseCase = new CreateActivityCategoryUseCase(activityCategoryRepository);
  const listActivityCategoriesUseCase = new ListActivityCategoriesUseCase(activityCategoryRepository);
  const reorderActivityCategoriesUseCase = new ReorderActivityCategoriesUseCase(activityCategoryRepository);
  const createActivityUseCase = new CreateActivityUseCase(activityCategoryRepository, activityRepository);
  const listActivitiesUseCase = new ListActivitiesUseCase(activityCategoryRepository, activityRepository);
  const listActivitiesForDateUseCase = new ListActivitiesForDateUseCase(listActivitiesUseCase, activityLogRepository);
  const reorderActivitiesUseCase = new ReorderActivitiesUseCase(activityCategoryRepository, activityRepository);
  const putActivityLogUseCase = new PutActivityLogUseCase(
    activityRepository,
    activityCategoryRepository,
    activityLogRepository,
  );
  const createFixedRoutineUseCase = new CreateFixedRoutineUseCase(
    fixedRoutineRepository,
    activityRepository,
    activityCategoryRepository,
  );
  const listFixedRoutinesUseCase = new ListFixedRoutinesUseCase(fixedRoutineRepository);
  const listFixedRoutinesForDateUseCase = new ListFixedRoutinesForDateUseCase(
    fixedRoutineRepository,
    routineLogRepository,
  );
  const deleteFixedRoutineUseCase = new DeleteFixedRoutineUseCase(fixedRoutineRepository);
  const putRoutineLogUseCase = new PutRoutineLogUseCase(fixedRoutineRepository, routineLogRepository, activityLogRepository);
  const updateFixedRoutineUseCase = new UpdateFixedRoutineUseCase(
    fixedRoutineRepository,
    activityRepository,
    activityCategoryRepository,
  );

  const listActivityLogsUseCase = new ListActivityLogsUseCase(activityLogRepository);

  const getFinanceSettingsUseCase = new GetFinanceSettingsUseCase(financeSettingsRepository);
  const updateFinanceSettingsUseCase = new UpdateFinanceSettingsUseCase(financeSettingsRepository);
  const getFinanceWeekSummaryUseCase = new GetFinanceWeekSummaryUseCase(
    moneyEntryRepository,
    financeSettingsRepository,
    financeDebtPaymentRepository,
    financeSavingsRepository,
    dailyExpenseRepository,
    fixedMonthlyExpenseRepository,
    fixedExpenseChargeRepository,
  );
  const createMoneyEntryUseCase = new CreateMoneyEntryUseCase(moneyEntryRepository, financeSettingsRepository);
  const updateMoneyEntryUseCase = new UpdateMoneyEntryUseCase(moneyEntryRepository, financeSettingsRepository);
  const deleteMoneyEntryUseCase = new DeleteMoneyEntryUseCase(moneyEntryRepository, financeSettingsRepository);
  const createDebtPaymentUseCase = new CreateDebtPaymentUseCase(financeDebtPaymentRepository);
  const createSavingsEntryUseCase = new CreateSavingsEntryUseCase(financeSavingsRepository);
  const listFinanceAnnualIncomeUseCase = new ListFinanceAnnualIncomeUseCase(
    financeAnnualIncomeRepository,
    moneyEntryRepository,
  );
  const upsertFinanceAnnualIncomeUseCase = new UpsertFinanceAnnualIncomeUseCase(financeAnnualIncomeRepository);
  const deleteFinanceAnnualIncomeUseCase = new DeleteFinanceAnnualIncomeUseCase(financeAnnualIncomeRepository);
  const setWalletBalanceUseCase = new SetWalletBalanceUseCase(financeSettingsRepository);

  const createCreditCardUseCase = new CreateCreditCardUseCase(creditCardRepository);
  const listCreditCardsUseCase = new ListCreditCardsUseCase(creditCardRepository);
  const updateCreditCardUseCase = new UpdateCreditCardUseCase(creditCardRepository);
  const deleteCreditCardUseCase = new DeleteCreditCardUseCase(creditCardRepository);

  const listDailyExpensesUseCase = new ListDailyExpensesUseCase(dailyExpenseRepository);
  const createDailyExpenseUseCase = new CreateDailyExpenseUseCase(dailyExpenseRepository, financeSettingsRepository);
  const updateDailyExpenseUseCase = new UpdateDailyExpenseUseCase(dailyExpenseRepository, financeSettingsRepository);
  const deleteDailyExpenseUseCase = new DeleteDailyExpenseUseCase(dailyExpenseRepository, financeSettingsRepository);
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

  const createWorkoutUseCase = new CreateWorkoutUseCase(workoutRepository);
  const listWorkoutsForWeekUseCase = new ListWorkoutsForWeekUseCase(workoutRepository);
  const deleteWorkoutUseCase = new DeleteWorkoutUseCase(workoutRepository);
  const getWorkoutPerformanceUseCase = new GetWorkoutPerformanceUseCase(workoutRepository);

  // --- Controllers ---
  const authController = new AuthController(
    registerUserUseCase,
    loginUserUseCase,
    loginWithGoogleUseCase,
    refreshAccessTokenUseCase,
  );
  const metricController = new MetricController(createMetricUseCase, listMetricsUseCase);
  const metricEntryController = new MetricEntryController(logMetricEntryUseCase, getMetricHistoryUseCase);
  const activityCategoryController = new ActivityCategoryController(
    createActivityCategoryUseCase,
    listActivityCategoriesUseCase,
    reorderActivityCategoriesUseCase,
  );
  const activityController = new ActivityController(
    createActivityUseCase,
    listActivitiesUseCase,
    listActivitiesForDateUseCase,
    reorderActivitiesUseCase,
    putActivityLogUseCase,
  );
  const fixedRoutineController = new FixedRoutineController(
    createFixedRoutineUseCase,
    listFixedRoutinesUseCase,
    listFixedRoutinesForDateUseCase,
    deleteFixedRoutineUseCase,
    putRoutineLogUseCase,
    updateFixedRoutineUseCase,
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
    listFinanceAnnualIncomeUseCase,
    upsertFinanceAnnualIncomeUseCase,
    deleteFinanceAnnualIncomeUseCase,
    setWalletBalanceUseCase,
  );
  const creditCardController = new CreditCardController(
    createCreditCardUseCase,
    listCreditCardsUseCase,
    updateCreditCardUseCase,
    deleteCreditCardUseCase,
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
  const workoutController = new WorkoutController(
    createWorkoutUseCase,
    listWorkoutsForWeekUseCase,
    deleteWorkoutUseCase,
    getWorkoutPerformanceUseCase,
  );

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

  app.get('/', (_req, res) => res.status(200).send('api working'));

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
      creditCardController,
      workoutController,
      authenticateMiddleware,
      idempotencyRepository,
    }),
  );

  app.use(errorHandler);

  return app;
}
