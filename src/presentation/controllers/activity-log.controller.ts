import { Request, Response } from 'express';
import { ListActivityLogsUseCase } from '../../application/use-cases/activity-log/list-activity-logs.use-case';
import { isValidDateOnly } from '../../shared/utils/week';

export class ActivityLogController {
  constructor(private readonly listActivityLogsUseCase: ListActivityLogsUseCase) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { from, to } = req.query;
    if (typeof from !== 'string' || typeof to !== 'string' || !isValidDateOnly(from) || !isValidDateOnly(to)) {
      res.status(400).json({ message: 'from/to query params are required and must be valid YYYY-MM-DD dates' });
      return;
    }

    const logs = await this.listActivityLogsUseCase.execute(req.user!.id, from, to);
    res.status(200).json(logs);
  };
}
