import { Request, Response } from 'express';
import { ListDailyExpensesUseCase } from '../../application/use-cases/expenses/list-daily-expenses.use-case';
import { CreateDailyExpenseUseCase } from '../../application/use-cases/expenses/create-daily-expense.use-case';
import { UpdateDailyExpenseUseCase } from '../../application/use-cases/expenses/update-daily-expense.use-case';
import { DeleteDailyExpenseUseCase } from '../../application/use-cases/expenses/delete-daily-expense.use-case';
import { ListFixedExpensesUseCase } from '../../application/use-cases/expenses/list-fixed-expenses.use-case';
import { CreateFixedExpenseUseCase } from '../../application/use-cases/expenses/create-fixed-expense.use-case';
import { UpdateFixedExpenseUseCase } from '../../application/use-cases/expenses/update-fixed-expense.use-case';
import { DeleteFixedExpenseUseCase } from '../../application/use-cases/expenses/delete-fixed-expense.use-case';
import { GetExpensesSummaryUseCase } from '../../application/use-cases/expenses/get-expenses-summary.use-case';
import { isValidDateOnly } from '../../shared/utils/week';

export class ExpensesController {
  constructor(
    private readonly listDailyExpensesUseCase: ListDailyExpensesUseCase,
    private readonly createDailyExpenseUseCase: CreateDailyExpenseUseCase,
    private readonly updateDailyExpenseUseCase: UpdateDailyExpenseUseCase,
    private readonly deleteDailyExpenseUseCase: DeleteDailyExpenseUseCase,
    private readonly listFixedExpensesUseCase: ListFixedExpensesUseCase,
    private readonly createFixedExpenseUseCase: CreateFixedExpenseUseCase,
    private readonly updateFixedExpenseUseCase: UpdateFixedExpenseUseCase,
    private readonly deleteFixedExpenseUseCase: DeleteFixedExpenseUseCase,
    private readonly getExpensesSummaryUseCase: GetExpensesSummaryUseCase,
  ) {}

  listDaily = async (req: Request, res: Response): Promise<void> => {
    const date = parseQueryDate(req.query.date);
    if (date === 'invalid') {
      res.status(400).json({ message: 'date query param must be a valid YYYY-MM-DD date' });
      return;
    }

    const expenses = await this.listDailyExpensesUseCase.execute(req.user!.id, date);
    res.status(200).json(expenses.map((expense) => expense.toJSON()));
  };

  createDaily = async (req: Request, res: Response): Promise<void> => {
    const expense = await this.createDailyExpenseUseCase.execute(req.user!.id, req.body);
    res.status(201).json(expense.toJSON());
  };

  updateDaily = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    const expense = await this.updateDailyExpenseUseCase.execute(req.user!.id, id, req.body);
    res.status(200).json(expense.toJSON());
  };

  deleteDaily = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    await this.deleteDailyExpenseUseCase.execute(req.user!.id, id);
    res.status(204).send();
  };

  listFixed = async (req: Request, res: Response): Promise<void> => {
    const expenses = await this.listFixedExpensesUseCase.execute(req.user!.id);
    res.status(200).json(expenses.map((expense) => expense.toJSON()));
  };

  createFixed = async (req: Request, res: Response): Promise<void> => {
    const expense = await this.createFixedExpenseUseCase.execute(req.user!.id, req.body);
    res.status(201).json(expense.toJSON());
  };

  updateFixed = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    const expense = await this.updateFixedExpenseUseCase.execute(req.user!.id, id, req.body);
    res.status(200).json(expense.toJSON());
  };

  deleteFixed = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    await this.deleteFixedExpenseUseCase.execute(req.user!.id, id);
    res.status(204).send();
  };

  getSummary = async (req: Request, res: Response): Promise<void> => {
    const date = parseQueryDate(req.query.date);
    if (date === 'invalid') {
      res.status(400).json({ message: 'date query param must be a valid YYYY-MM-DD date' });
      return;
    }

    const summary = await this.getExpensesSummaryUseCase.execute(req.user!.id, date);
    res.status(200).json(summary);
  };
}

function parseQueryDate(value: unknown): string | undefined | 'invalid' {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !isValidDateOnly(value)) return 'invalid';
  return value;
}
