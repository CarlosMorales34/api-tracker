import { Request, Response } from 'express';
import { CreateCreditCardUseCase } from '../../application/use-cases/credit-card/create-credit-card.use-case';
import { ListCreditCardsUseCase } from '../../application/use-cases/credit-card/list-credit-cards.use-case';
import { UpdateCreditCardUseCase } from '../../application/use-cases/credit-card/update-credit-card.use-case';
import { DeleteCreditCardUseCase } from '../../application/use-cases/credit-card/delete-credit-card.use-case';

export class CreditCardController {
  constructor(
    private readonly createCreditCardUseCase: CreateCreditCardUseCase,
    private readonly listCreditCardsUseCase: ListCreditCardsUseCase,
    private readonly updateCreditCardUseCase: UpdateCreditCardUseCase,
    private readonly deleteCreditCardUseCase: DeleteCreditCardUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const card = await this.createCreditCardUseCase.execute(req.user!.id, req.body);
    res.status(201).json(card.toJSON());
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const cards = await this.listCreditCardsUseCase.execute(req.user!.id);
    res.status(200).json(cards.map((card) => card.toJSON()));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    const card = await this.updateCreditCardUseCase.execute(req.user!.id, id, req.body);
    res.status(200).json(card.toJSON());
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }

    await this.deleteCreditCardUseCase.execute(req.user!.id, id);
    res.status(204).send();
  };
}
