import { Request, Response } from 'express';
import { CreateBodyMeasurementUseCase } from '../../application/use-cases/body-progress/create-body-measurement.use-case';
import { UpdateBodyMeasurementUseCase } from '../../application/use-cases/body-progress/update-body-measurement.use-case';
import { DeleteBodyMeasurementUseCase } from '../../application/use-cases/body-progress/delete-body-measurement.use-case';
import { ListBodyMeasurementsUseCase } from '../../application/use-cases/body-progress/list-body-measurements.use-case';
import { GetBodyProgressSummaryUseCase } from '../../application/use-cases/body-progress/get-body-progress-summary.use-case';
import { SetBodyGoalUseCase } from '../../application/use-cases/body-progress/set-body-goal.use-case';
import { GetBodyGoalHistoryUseCase } from '../../application/use-cases/body-progress/get-body-goal-history.use-case';
import { todayDateOnly } from '../../shared/utils/week';

export class BodyProgressController {
  constructor(
    private readonly createBodyMeasurementUseCase: CreateBodyMeasurementUseCase,
    private readonly updateBodyMeasurementUseCase: UpdateBodyMeasurementUseCase,
    private readonly deleteBodyMeasurementUseCase: DeleteBodyMeasurementUseCase,
    private readonly listBodyMeasurementsUseCase: ListBodyMeasurementsUseCase,
    private readonly getBodyProgressSummaryUseCase: GetBodyProgressSummaryUseCase,
    private readonly setBodyGoalUseCase: SetBodyGoalUseCase,
    private readonly getBodyGoalHistoryUseCase: GetBodyGoalHistoryUseCase,
  ) {}

  createMeasurement = async (req: Request, res: Response): Promise<void> => {
    const measurement = await this.createBodyMeasurementUseCase.execute(req.user!.id, req.body);
    res.status(201).json(measurement.toJSON());
  };

  updateMeasurement = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }
    const measurement = await this.updateBodyMeasurementUseCase.execute(req.user!.id, id, req.body);
    res.status(200).json(measurement.toJSON());
  };

  deleteMeasurement = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }
    await this.deleteBodyMeasurementUseCase.execute(req.user!.id, id);
    res.status(204).send();
  };

  listMeasurements = async (req: Request, res: Response): Promise<void> => {
    const from = parseQueryString(req.query.from);
    const to = parseQueryString(req.query.to) ?? todayDateOnly();
    if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      res.status(400).json({ message: 'from query param (YYYY-MM-DD) is required; to defaults to today' });
      return;
    }
    const measurements = await this.listBodyMeasurementsUseCase.execute(req.user!.id, from, to);
    res.status(200).json(measurements.map((m) => m.toJSON()));
  };

  getSummary = async (req: Request, res: Response): Promise<void> => {
    const summary = await this.getBodyProgressSummaryUseCase.execute(req.user!.id);
    res.status(200).json(summary);
  };

  setGoal = async (req: Request, res: Response): Promise<void> => {
    const goal = await this.setBodyGoalUseCase.execute(req.user!.id, req.body);
    res.status(201).json(goal.toJSON());
  };

  getGoalHistory = async (req: Request, res: Response): Promise<void> => {
    const goals = await this.getBodyGoalHistoryUseCase.execute(req.user!.id);
    res.status(200).json(goals.map((g) => g.toJSON()));
  };
}

function parseQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
