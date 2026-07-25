import { Request, Response } from 'express';
import { CreateFixedRoutineUseCase } from '../../application/use-cases/fixed-routine/create-fixed-routine.use-case';
import { ListFixedRoutinesUseCase } from '../../application/use-cases/fixed-routine/list-fixed-routines.use-case';
import { ListFixedRoutinesForDateUseCase } from '../../application/use-cases/fixed-routine/list-fixed-routines-for-date.use-case';
import { DeleteFixedRoutineUseCase } from '../../application/use-cases/fixed-routine/delete-fixed-routine.use-case';
import { PutRoutineLogUseCase } from '../../application/use-cases/fixed-routine/put-routine-log.use-case';
import { UpdateFixedRoutineUseCase } from '../../application/use-cases/fixed-routine/update-fixed-routine.use-case';

export class FixedRoutineController {
  constructor(
    private readonly createFixedRoutineUseCase: CreateFixedRoutineUseCase,
    private readonly listFixedRoutinesUseCase: ListFixedRoutinesUseCase,
    private readonly listFixedRoutinesForDateUseCase: ListFixedRoutinesForDateUseCase,
    private readonly deleteFixedRoutineUseCase: DeleteFixedRoutineUseCase,
    private readonly putRoutineLogUseCase: PutRoutineLogUseCase,
    private readonly updateFixedRoutineUseCase: UpdateFixedRoutineUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const routine = await this.createFixedRoutineUseCase.execute(userId, req.body);
    res.status(201).json(routine.toJSON());
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    const routine = await this.updateFixedRoutineUseCase.execute(userId, id, req.body);
    res.status(200).json(routine.toJSON());
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const date = parseQueryString(req.query.date);

    if (!date) {
      const routines = await this.listFixedRoutinesUseCase.execute(userId);
      res.status(200).json(routines.map((routine) => routine.toJSON()));
      return;
    }

    const routinesWithTimes = await this.listFixedRoutinesForDateUseCase.execute(userId, date);
    res.status(200).json(
      routinesWithTimes.map(({ routine, times }) => ({ ...routine.toJSON(), times })),
    );
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    await this.deleteFixedRoutineUseCase.execute(userId, id);
    res.status(204).send();
  };

  putLog = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    const { date, times } = req.body;
    const normalizedTimes = times.map((time: { start: string; end?: string | null }) => ({
      start: time.start,
      end: time.end ?? null,
    }));

    const saved = await this.putRoutineLogUseCase.execute(userId, id, date, normalizedTimes);
    res.status(200).json({ times: saved });
  };
}

function parseQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
