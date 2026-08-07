import { Request, Response } from 'express';
import { CreateWorkoutRoutineUseCase } from '../../application/use-cases/workout-routine/create-workout-routine.use-case';
import { UpdateWorkoutRoutineUseCase } from '../../application/use-cases/workout-routine/update-workout-routine.use-case';
import { ListWorkoutRoutinesUseCase } from '../../application/use-cases/workout-routine/list-workout-routines.use-case';
import { DeleteWorkoutRoutineUseCase } from '../../application/use-cases/workout-routine/delete-workout-routine.use-case';

export class WorkoutRoutineController {
  constructor(
    private readonly createWorkoutRoutineUseCase: CreateWorkoutRoutineUseCase,
    private readonly updateWorkoutRoutineUseCase: UpdateWorkoutRoutineUseCase,
    private readonly listWorkoutRoutinesUseCase: ListWorkoutRoutinesUseCase,
    private readonly deleteWorkoutRoutineUseCase: DeleteWorkoutRoutineUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const routine = await this.createWorkoutRoutineUseCase.execute(req.user!.id, req.body);
    res.status(201).json(routine.toJSON());
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const routines = await this.listWorkoutRoutinesUseCase.execute(req.user!.id);
    res.status(200).json(routines.map((routine) => routine.toJSON()));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    const routine = await this.updateWorkoutRoutineUseCase.execute(req.user!.id, id, req.body);
    res.status(200).json(routine.toJSON());
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    await this.deleteWorkoutRoutineUseCase.execute(req.user!.id, id);
    res.status(204).send();
  };
}
