import { Request, Response } from 'express';
import { CreateMetricUseCase } from '../../application/use-cases/metric/create-metric.use-case';
import { ListMetricsUseCase } from '../../application/use-cases/metric/list-metrics.use-case';

export class MetricController {
  constructor(
    private readonly createMetricUseCase: CreateMetricUseCase,
    private readonly listMetricsUseCase: ListMetricsUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const metric = await this.createMetricUseCase.execute(req.body);
    res.status(201).json(metric.toJSON());
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    const metrics = await this.listMetricsUseCase.execute();
    res.status(200).json(metrics.map((metric) => metric.toJSON()));
  };
}
