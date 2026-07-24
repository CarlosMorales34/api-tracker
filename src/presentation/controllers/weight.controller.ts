import { Request, Response } from 'express';
import { GetWeightYearUseCase } from '../../application/use-cases/weight/get-weight-year.use-case';
import { PutWeightMonthUseCase } from '../../application/use-cases/weight/put-weight-month.use-case';
import { PutWeightMonthNoteUseCase } from '../../application/use-cases/weight/put-weight-month-note.use-case';
import { GetWeightSettingsUseCase } from '../../application/use-cases/weight/get-weight-settings.use-case';
import { PutWeightSettingsUseCase } from '../../application/use-cases/weight/put-weight-settings.use-case';
import { GetWeightYearlyExtremesUseCase } from '../../application/use-cases/weight/get-weight-yearly-extremes.use-case';

export class WeightController {
  constructor(
    private readonly getWeightYearUseCase: GetWeightYearUseCase,
    private readonly putWeightMonthUseCase: PutWeightMonthUseCase,
    private readonly putWeightMonthNoteUseCase: PutWeightMonthNoteUseCase,
    private readonly getWeightSettingsUseCase: GetWeightSettingsUseCase,
    private readonly putWeightSettingsUseCase: PutWeightSettingsUseCase,
    private readonly getWeightYearlyExtremesUseCase: GetWeightYearlyExtremesUseCase,
  ) {}

  getYear = async (req: Request, res: Response): Promise<void> => {
    const year = parseYearParam(req.params.year);
    if (year === null) {
      res.status(400).json({ message: 'year route param must be a valid integer' });
      return;
    }

    const summary = await this.getWeightYearUseCase.execute(req.user!.id, year);
    res.status(200).json(summary);
  };

  putMonth = async (req: Request, res: Response): Promise<void> => {
    const entry = await this.putWeightMonthUseCase.execute(req.user!.id, req.body);
    res.status(200).json(entry.toJSON());
  };

  putMonthNote = async (req: Request, res: Response): Promise<void> => {
    const entry = await this.putWeightMonthNoteUseCase.execute(req.user!.id, req.body);
    res.status(200).json(entry.toJSON());
  };

  getSettings = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.getWeightSettingsUseCase.execute(req.user!.id);
    res.status(200).json(settings);
  };

  putSettings = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.putWeightSettingsUseCase.execute(req.user!.id, req.body);
    res.status(200).json(settings);
  };

  getYearlyExtremes = async (req: Request, res: Response): Promise<void> => {
    const extremes = await this.getWeightYearlyExtremesUseCase.execute(req.user!.id);
    res.status(200).json(extremes);
  };
}

function parseYearParam(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : null;
}
