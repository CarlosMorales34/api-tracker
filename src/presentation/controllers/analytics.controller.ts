import { Request, Response } from 'express';
import { GetPersonalAnalyticsSummaryUseCase } from '../../application/use-cases/analytics/get-personal-analytics-summary.use-case';

export class AnalyticsController {
  constructor(private readonly getPersonalAnalyticsSummaryUseCase: GetPersonalAnalyticsSummaryUseCase) {}

  getPersonalSummary = async (req: Request, res: Response): Promise<void> => {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const summary = await this.getPersonalAnalyticsSummaryUseCase.execute(req.user!.id, { from, to });
    res.status(200).json(summary);
  };
}
