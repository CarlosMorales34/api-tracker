import { Request, Response } from 'express';
import { CreateActivityCategoryUseCase } from '../../application/use-cases/activity-category/create-activity-category.use-case';
import { ListActivityCategoriesUseCase } from '../../application/use-cases/activity-category/list-activity-categories.use-case';

export class ActivityCategoryController {
  constructor(
    private readonly createActivityCategoryUseCase: CreateActivityCategoryUseCase,
    private readonly listActivityCategoriesUseCase: ListActivityCategoriesUseCase,
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
}
