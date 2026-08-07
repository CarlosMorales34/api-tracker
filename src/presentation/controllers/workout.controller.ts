import { Request, Response } from 'express';
import { CreateWorkoutUseCase } from '../../application/use-cases/workout/create-workout.use-case';
import { UpdateWorkoutUseCase } from '../../application/use-cases/workout/update-workout.use-case';
import { ListWorkoutsForWeekUseCase } from '../../application/use-cases/workout/list-workouts-for-week.use-case';
import { DeleteWorkoutUseCase } from '../../application/use-cases/workout/delete-workout.use-case';
import { GetWorkoutPerformanceUseCase } from '../../application/use-cases/workout/get-workout-performance.use-case';
import { isValidDateOnly } from '../../shared/utils/week';

export class WorkoutController {
  constructor(
    private readonly createWorkoutUseCase: CreateWorkoutUseCase,
    private readonly updateWorkoutUseCase: UpdateWorkoutUseCase,
    private readonly listWorkoutsForWeekUseCase: ListWorkoutsForWeekUseCase,
    private readonly deleteWorkoutUseCase: DeleteWorkoutUseCase,
    private readonly getWorkoutPerformanceUseCase: GetWorkoutPerformanceUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const workout = await this.createWorkoutUseCase.execute(req.user!.id, req.body);
    res.status(201).json(workout.toJSON());
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    const workout = await this.updateWorkoutUseCase.execute(req.user!.id, id, req.body);
    res.status(200).json(workout.toJSON());
  };

  listForWeek = async (req: Request, res: Response): Promise<void> => {
    const weekStartDate = req.query.weekStart;
    if (typeof weekStartDate !== 'string' || !isValidDateOnly(weekStartDate)) {
      res.status(400).json({ message: 'weekStart query param must be a valid YYYY-MM-DD date' });
      return;
    }

    const workouts = await this.listWorkoutsForWeekUseCase.execute(req.user!.id, weekStartDate);
    res.status(200).json(workouts.map((w) => w.toJSON()));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    await this.deleteWorkoutUseCase.execute(req.user!.id, id);
    res.status(204).send();
  };

  getPerformance = async (req: Request, res: Response): Promise<void> => {
    const performance = await this.getWorkoutPerformanceUseCase.execute(req.user!.id);
    res.status(200).json(performance);
  };
}
