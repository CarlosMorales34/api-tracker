import { Request, Response } from 'express';
import { CreateActivityUseCase } from '../../application/use-cases/activity/create-activity.use-case';
import { ListActivitiesUseCase } from '../../application/use-cases/activity/list-activities.use-case';
import { ListActivitiesForDateUseCase } from '../../application/use-cases/activity/list-activities-for-date.use-case';
import { ReorderActivitiesUseCase } from '../../application/use-cases/activity/reorder-activities.use-case';
import { PutActivityLogUseCase } from '../../application/use-cases/activity-log/put-activity-log.use-case';

export class ActivityController {
  constructor(
    private readonly createActivityUseCase: CreateActivityUseCase,
    private readonly listActivitiesUseCase: ListActivitiesUseCase,
    private readonly listActivitiesForDateUseCase: ListActivitiesForDateUseCase,
    private readonly reorderActivitiesUseCase: ReorderActivitiesUseCase,
    private readonly putActivityLogUseCase: PutActivityLogUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const activity = await this.createActivityUseCase.execute(userId, req.body);
    res.status(201).json(activity.toJSON());
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const categoryId = parseQueryString(req.query.categoryId);
    const date = parseQueryString(req.query.date);

    if (!date) {
      const activities = await this.listActivitiesUseCase.execute(userId, categoryId);
      res.status(200).json(activities.map((activity) => activity.toJSON()));
      return;
    }

    const activitiesWithHours = await this.listActivitiesForDateUseCase.execute(userId, date, categoryId);
    res.status(200).json(
      activitiesWithHours.map(({ activity, hours }) => ({ ...activity.toJSON(), todayHours: hours })),
    );
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { categoryId, orderedIds } = req.body;
    await this.reorderActivitiesUseCase.execute(userId, categoryId, orderedIds);
    res.status(204).send();
  };

  putLog = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    const { date, hours } = req.body;
    const saved = await this.putActivityLogUseCase.execute(userId, id, date, hours);
    res.status(200).json({ hours: saved });
  };
}

function parseQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
