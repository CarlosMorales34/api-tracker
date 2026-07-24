import { Request, Response } from 'express';
import { GetWeeklyLogYearUseCase } from '../../application/use-cases/weekly-log/get-weekly-log-year.use-case';
import { GetWeeklyLogWeekUseCase } from '../../application/use-cases/weekly-log/get-weekly-log-week.use-case';
import { PutWeekNotesUseCase } from '../../application/use-cases/weekly-log/put-week-notes.use-case';
import { ListAnnualCountersUseCase } from '../../application/use-cases/weekly-log/list-annual-counters.use-case';
import { CreateAnnualCounterUseCase } from '../../application/use-cases/weekly-log/create-annual-counter.use-case';
import { DeleteAnnualCounterUseCase } from '../../application/use-cases/weekly-log/delete-annual-counter.use-case';

export class WeeklyLogController {
  constructor(
    private readonly getWeeklyLogYearUseCase: GetWeeklyLogYearUseCase,
    private readonly getWeeklyLogWeekUseCase: GetWeeklyLogWeekUseCase,
    private readonly putWeekNotesUseCase: PutWeekNotesUseCase,
    private readonly listAnnualCountersUseCase: ListAnnualCountersUseCase,
    private readonly createAnnualCounterUseCase: CreateAnnualCounterUseCase,
    private readonly deleteAnnualCounterUseCase: DeleteAnnualCounterUseCase,
  ) {}

  getYear = async (req: Request, res: Response): Promise<void> => {
    const year = parseIntParam(req.params.year, 2000, 2100);
    if (year === null) {
      res.status(400).json({ message: 'year route param must be a valid integer' });
      return;
    }

    const summary = await this.getWeeklyLogYearUseCase.execute(req.user!.id, year);
    res.status(200).json(summary);
  };

  getWeek = async (req: Request, res: Response): Promise<void> => {
    const year = parseIntParam(req.params.year, 2000, 2100);
    const weekNumber = parseIntParam(req.params.weekNumber, 1, 52);
    if (year === null || weekNumber === null) {
      res.status(400).json({ message: 'year/weekNumber route params must be valid (year 2000-2100, weekNumber 1-52)' });
      return;
    }

    const detail = await this.getWeeklyLogWeekUseCase.execute(req.user!.id, year, weekNumber);
    res.status(200).json(detail);
  };

  putNotes = async (req: Request, res: Response): Promise<void> => {
    const year = parseIntParam(req.params.year, 2000, 2100);
    const weekNumber = parseIntParam(req.params.weekNumber, 1, 52);
    if (year === null || weekNumber === null) {
      res.status(400).json({ message: 'year/weekNumber route params must be valid (year 2000-2100, weekNumber 1-52)' });
      return;
    }

    const result = await this.putWeekNotesUseCase.execute(req.user!.id, year, weekNumber, req.body);
    res.status(200).json(result);
  };

  listCounters = async (req: Request, res: Response): Promise<void> => {
    const yearQuery = req.query.year;
    let year: number;
    if (yearQuery === undefined) {
      year = new Date().getFullYear();
    } else {
      const parsed = parseIntParam(yearQuery, 2000, 2100);
      if (parsed === null) {
        res.status(400).json({ message: 'year query param must be a valid integer' });
        return;
      }
      year = parsed;
    }

    const counters = await this.listAnnualCountersUseCase.execute(req.user!.id, year);
    res.status(200).json(counters);
  };

  createCounter = async (req: Request, res: Response): Promise<void> => {
    const counter = await this.createAnnualCounterUseCase.execute(req.user!.id, req.body);
    res.status(201).json(counter.toJSON());
  };

  deleteCounter = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    await this.deleteAnnualCounterUseCase.execute(req.user!.id, id);
    res.status(204).send();
  };
}

function parseIntParam(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}
