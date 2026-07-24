import { Request, Response } from 'express';
import { GetHomeSummaryUseCase } from '../../application/use-cases/home/get-home-summary.use-case';

export class HomeController {
  constructor(private readonly getHomeSummaryUseCase: GetHomeSummaryUseCase) {}

  getSummary = async (req: Request, res: Response): Promise<void> => {
    const summary = await this.getHomeSummaryUseCase.execute(req.user!.id);
    res.status(200).json(summary);
  };
}
