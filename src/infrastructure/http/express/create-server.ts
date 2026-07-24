import express, { Express } from 'express';
import { Pool } from 'mysql2/promise';
import { apiRoutes } from '../../../presentation/routes';
import { MetricController } from '../../../presentation/controllers/metric.controller';
import { MetricEntryController } from '../../../presentation/controllers/metric-entry.controller';
import { errorHandler } from '../../../presentation/middlewares/error-handler.middleware';
import { MysqlMetricRepository } from '../../database/mysql/repositories/mysql-metric.repository';
import { MysqlMetricEntryRepository } from '../../database/mysql/repositories/mysql-metric-entry.repository';
import { CreateMetricUseCase } from '../../../application/use-cases/metric/create-metric.use-case';
import { ListMetricsUseCase } from '../../../application/use-cases/metric/list-metrics.use-case';
import { LogMetricEntryUseCase } from '../../../application/use-cases/metric-entry/log-metric-entry.use-case';
import { GetMetricHistoryUseCase } from '../../../application/use-cases/metric-entry/get-metric-history.use-case';

// Express 5 forwards rejected promises from async handlers to errorHandler automatically.
export function createServer(pool: Pool): Express {
  const metricRepository = new MysqlMetricRepository(pool);
  const metricEntryRepository = new MysqlMetricEntryRepository(pool);

  const metricController = new MetricController(
    new CreateMetricUseCase(metricRepository),
    new ListMetricsUseCase(metricRepository),
  );

  const metricEntryController = new MetricEntryController(
    new LogMetricEntryUseCase(metricRepository, metricEntryRepository),
    new GetMetricHistoryUseCase(metricRepository, metricEntryRepository),
  );

  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', apiRoutes(metricController, metricEntryController));
  app.use(errorHandler);

  return app;
}
