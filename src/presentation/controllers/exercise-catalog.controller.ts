import { Request, Response } from 'express';
import { ManageExerciseCatalogUseCase } from '../../application/use-cases/workout/manage-exercise-catalog.use-case';

export class ExerciseCatalogController {
  constructor(private readonly useCase: ManageExerciseCatalogUseCase) {}
  list = async (req: Request, res: Response) => { res.json(await this.useCase.list(req.user!.id)); };
  create = async (req: Request, res: Response) => { res.status(201).json(await this.useCase.create(req.user!.id, req.body.name)); };
  rename = async (req: Request, res: Response) => { await this.useCase.rename(req.user!.id, String(req.params.id), req.body.name); res.sendStatus(204); };
  merge = async (req: Request, res: Response) => { await this.useCase.merge(req.user!.id, String(req.params.id), req.body.targetId); res.sendStatus(204); };
}
