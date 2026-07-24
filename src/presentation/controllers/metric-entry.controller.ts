import { Request, Response } from 'express';
import { LogMetricEntryUseCase } from '../../application/use-cases/metric-entry/log-metric-entry.use-case';
import { GetMetricHistoryUseCase } from '../../application/use-cases/metric-entry/get-metric-history.use-case';

export class MetricEntryController {
  constructor(
    private readonly logMetricEntryUseCase: LogMetricEntryUseCase,
    private readonly getMetricHistoryUseCase: GetMetricHistoryUseCase,
  ) {}

  log = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const entry = await this.logMetricEntryUseCase.execute(userId, req.body);
    res.status(201).json(entry.toJSON());
  };

  history = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { metricId } = req.params;
    if (typeof metricId !== 'string' || metricId.length === 0) {
      res.status(400).json({ message: 'metricId route param is required' });
      return;
    }

    const entries = await this.getMetricHistoryUseCase.execute(userId, metricId);
    res.status(200).json(entries.map((entry) => entry.toJSON()));
  };
}
