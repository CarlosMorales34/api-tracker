import { Request, Response } from 'express';
import { GetFinanceSettingsUseCase } from '../../application/use-cases/finance/get-finance-settings.use-case';
import { UpdateFinanceSettingsUseCase } from '../../application/use-cases/finance/update-finance-settings.use-case';
import { GetFinanceWeekSummaryUseCase } from '../../application/use-cases/finance/get-finance-week-summary.use-case';
import { CreateMoneyEntryUseCase } from '../../application/use-cases/finance/create-money-entry.use-case';
import { UpdateMoneyEntryUseCase } from '../../application/use-cases/finance/update-money-entry.use-case';
import { DeleteMoneyEntryUseCase } from '../../application/use-cases/finance/delete-money-entry.use-case';
import { CreateDebtPaymentUseCase } from '../../application/use-cases/finance/create-debt-payment.use-case';
import { CreateSavingsEntryUseCase } from '../../application/use-cases/finance/create-savings-entry.use-case';
import { isValidDateOnly } from '../../shared/utils/week';

export class FinanceController {
  constructor(
    private readonly getFinanceSettingsUseCase: GetFinanceSettingsUseCase,
    private readonly updateFinanceSettingsUseCase: UpdateFinanceSettingsUseCase,
    private readonly getFinanceWeekSummaryUseCase: GetFinanceWeekSummaryUseCase,
    private readonly createMoneyEntryUseCase: CreateMoneyEntryUseCase,
    private readonly updateMoneyEntryUseCase: UpdateMoneyEntryUseCase,
    private readonly deleteMoneyEntryUseCase: DeleteMoneyEntryUseCase,
    private readonly createDebtPaymentUseCase: CreateDebtPaymentUseCase,
    private readonly createSavingsEntryUseCase: CreateSavingsEntryUseCase,
  ) {}

  getSettings = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.getFinanceSettingsUseCase.execute(req.user!.id);
    res.status(200).json(settings);
  };

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.updateFinanceSettingsUseCase.execute(req.user!.id, req.body);
    res.status(200).json(settings);
  };

  getWeekSummary = async (req: Request, res: Response): Promise<void> => {
    const { weekStartDate } = req.params;
    if (typeof weekStartDate !== 'string' || !isValidDateOnly(weekStartDate)) {
      res.status(400).json({ message: 'weekStartDate route param must be a valid YYYY-MM-DD date' });
      return;
    }

    const summary = await this.getFinanceWeekSummaryUseCase.execute(req.user!.id, weekStartDate);
    res.status(200).json(summary);
  };

  createEntry = async (req: Request, res: Response): Promise<void> => {
    const entry = await this.createMoneyEntryUseCase.execute(req.user!.id, req.body);
    res.status(201).json(entry.toJSON());
  };

  updateEntry = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    const entry = await this.updateMoneyEntryUseCase.execute(req.user!.id, id, req.body);
    res.status(200).json(entry.toJSON());
  };

  deleteEntry = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    await this.deleteMoneyEntryUseCase.execute(req.user!.id, id);
    res.status(204).send();
  };

  createDebtPayment = async (req: Request, res: Response): Promise<void> => {
    const payment = await this.createDebtPaymentUseCase.execute(req.user!.id, req.body);
    res.status(201).json(payment);
  };

  createSavings = async (req: Request, res: Response): Promise<void> => {
    const entry = await this.createSavingsEntryUseCase.execute(req.user!.id, req.body);
    res.status(201).json(entry);
  };
}
