import { Request, Response } from 'express';
import { CreateActivityUseCase } from '../../application/use-cases/activity/create-activity.use-case';
import { ListActivitiesUseCase } from '../../application/use-cases/activity/list-activities.use-case';
import { ListActivitiesForDateUseCase } from '../../application/use-cases/activity/list-activities-for-date.use-case';
import { ReorderActivitiesUseCase } from '../../application/use-cases/activity/reorder-activities.use-case';
import { DeleteActivityUseCase } from '../../application/use-cases/activity/delete-activity.use-case';
import { GetDailyFeedbackUseCase } from '../../application/use-cases/activity/get-daily-feedback.use-case';
import { PutDailyFeedbackUseCase } from '../../application/use-cases/activity/put-daily-feedback.use-case';
import { PutActivityLogUseCase } from '../../application/use-cases/activity-log/put-activity-log.use-case';

export class ActivityController {
  constructor(
    private readonly createActivityUseCase: CreateActivityUseCase,
    private readonly listActivitiesUseCase: ListActivitiesUseCase,
    private readonly listActivitiesForDateUseCase: ListActivitiesForDateUseCase,
    private readonly reorderActivitiesUseCase: ReorderActivitiesUseCase,
    private readonly deleteActivityUseCase: DeleteActivityUseCase,
    private readonly putActivityLogUseCase: PutActivityLogUseCase,
    private readonly getDailyFeedbackUseCase: GetDailyFeedbackUseCase,
    private readonly putDailyFeedbackUseCase: PutDailyFeedbackUseCase,
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
      activitiesWithHours.map(({ activity, hours, times }) => ({
        ...activity.toJSON(),
        todayHours: hours,
        todayTimes: times,
      })),
    );
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { categoryId, orderedIds } = req.body;
    await this.reorderActivitiesUseCase.execute(userId, categoryId, orderedIds);
    res.status(204).send();
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }
    await this.deleteActivityUseCase.execute(userId, id);
    res.status(204).send();
  };

  getFeedback = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const date = parseQueryString(req.query.date);
    if (!date) {
      res.status(400).json({ message: 'date query param is required' });
      return;
    }
    const result = await this.getDailyFeedbackUseCase.execute(userId, date);
    res.status(200).json(result);
  };

  putFeedback = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const result = await this.putDailyFeedbackUseCase.execute(userId, req.body);
    res.status(200).json(result);
  };

  putLog = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    const { date, times } = req.body;
    const saved = await this.putActivityLogUseCase.execute(userId, id, date, times);
    res.status(200).json(saved);
  };
}

function parseQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
