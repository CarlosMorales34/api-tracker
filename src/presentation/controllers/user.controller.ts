import { Request, Response } from 'express';
import { GetUserModuleSettingsUseCase } from '../../application/use-cases/user/get-user-module-settings.use-case';
import { UpdateUserModuleSettingsUseCase } from '../../application/use-cases/user/update-user-module-settings.use-case';

export class UserController {
  constructor(
    private readonly getUserModuleSettingsUseCase: GetUserModuleSettingsUseCase,
    private readonly updateUserModuleSettingsUseCase: UpdateUserModuleSettingsUseCase,
  ) {}

  getModules = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.getUserModuleSettingsUseCase.execute(req.user!.id);
    res.status(200).json(settings);
  };

  updateModules = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.updateUserModuleSettingsUseCase.execute(req.user!.id, req.body);
    res.status(200).json(settings);
  };
}
