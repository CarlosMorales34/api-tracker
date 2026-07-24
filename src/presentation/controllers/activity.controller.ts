import { Request, Response } from 'express';
import { CreateActivityUseCase } from '../../application/use-cases/activity/create-activity.use-case';
import { ListActivitiesUseCase } from '../../application/use-cases/activity/list-activities.use-case';

export class ActivityController {
  constructor(
    private readonly createActivityUseCase: CreateActivityUseCase,
    private readonly listActivitiesUseCase: ListActivitiesUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const activity = await this.createActivityUseCase.execute(userId, req.body);
    res.status(201).json(activity.toJSON());
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const categoryId = parseQueryString(req.query.categoryId);
    const activities = await this.listActivitiesUseCase.execute(userId, categoryId);
    res.status(200).json(activities.map((activity) => activity.toJSON()));
  };
}

function parseQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
