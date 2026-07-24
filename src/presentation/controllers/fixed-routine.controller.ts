import { Request, Response } from 'express';
import { CreateFixedRoutineUseCase } from '../../application/use-cases/fixed-routine/create-fixed-routine.use-case';
import { ListFixedRoutinesUseCase } from '../../application/use-cases/fixed-routine/list-fixed-routines.use-case';
import { DeleteFixedRoutineUseCase } from '../../application/use-cases/fixed-routine/delete-fixed-routine.use-case';

export class FixedRoutineController {
  constructor(
    private readonly createFixedRoutineUseCase: CreateFixedRoutineUseCase,
    private readonly listFixedRoutinesUseCase: ListFixedRoutinesUseCase,
    private readonly deleteFixedRoutineUseCase: DeleteFixedRoutineUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const routine = await this.createFixedRoutineUseCase.execute(userId, req.body);
    res.status(201).json(routine.toJSON());
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const routines = await this.listFixedRoutinesUseCase.execute(userId);
    res.status(200).json(routines.map((routine) => routine.toJSON()));
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
}
