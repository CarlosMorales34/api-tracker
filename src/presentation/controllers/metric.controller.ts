import { Request, Response } from 'express';
import { CreateMetricUseCase } from '../../application/use-cases/metric/create-metric.use-case';
import { ListMetricsUseCase } from '../../application/use-cases/metric/list-metrics.use-case';

export class MetricController {
  constructor(
    private readonly createMetricUseCase: CreateMetricUseCase,
    private readonly listMetricsUseCase: ListMetricsUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    // userId always comes from the authenticated request, never from the body.
    const userId = req.user!.id;
    const metric = await this.createMetricUseCase.execute(userId, req.body);
    res.status(201).json(metric.toJSON());
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const limit = parseQueryNumber(req.query.limit);
    const offset = parseQueryNumber(req.query.offset);

    const metrics = await this.listMetricsUseCase.execute(userId, { limit, offset });
    res.status(200).json(metrics.map((metric) => metric.toJSON()));
  };
}

function parseQueryNumber(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
