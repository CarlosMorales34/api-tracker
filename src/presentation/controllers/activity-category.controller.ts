import { Request, Response } from 'express';
import { CreateActivityCategoryUseCase } from '../../application/use-cases/activity-category/create-activity-category.use-case';
import { ListActivityCategoriesUseCase } from '../../application/use-cases/activity-category/list-activity-categories.use-case';
import { ReorderActivityCategoriesUseCase } from '../../application/use-cases/activity-category/reorder-activity-categories.use-case';
import { DeleteActivityCategoryUseCase } from '../../application/use-cases/activity-category/delete-activity-category.use-case';

export class ActivityCategoryController {
  constructor(
    private readonly createActivityCategoryUseCase: CreateActivityCategoryUseCase,
    private readonly listActivityCategoriesUseCase: ListActivityCategoriesUseCase,
    private readonly reorderActivityCategoriesUseCase: ReorderActivityCategoriesUseCase,
    private readonly deleteActivityCategoryUseCase: DeleteActivityCategoryUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    // userId siempre sale del request autenticado, nunca del body.
    const userId = req.user!.id;
    const category = await this.createActivityCategoryUseCase.execute(userId, req.body);
    res.status(201).json(category.toJSON());
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const categories = await this.listActivityCategoriesUseCase.execute(userId);
    res.status(200).json(categories.map((category) => category.toJSON()));
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    await this.reorderActivityCategoriesUseCase.execute(userId, req.body.orderedIds);
    res.status(204).send();
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }
    await this.deleteActivityCategoryUseCase.execute(userId, id);
    res.status(204).send();
  };
}
