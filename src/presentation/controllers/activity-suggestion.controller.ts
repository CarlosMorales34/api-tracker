import { Request, Response } from 'express';
import { GenerateSuggestionsUseCase } from '../../application/use-cases/activity-suggestion/generate-suggestions.use-case';
import { ListSuggestionsUseCase } from '../../application/use-cases/activity-suggestion/list-suggestions.use-case';
import { AcceptSuggestionUseCase } from '../../application/use-cases/activity-suggestion/accept-suggestion.use-case';
import { DismissSuggestionUseCase } from '../../application/use-cases/activity-suggestion/dismiss-suggestion.use-case';
import { ClearSuggestionHistoryUseCase } from '../../application/use-cases/activity-suggestion/clear-suggestion-history.use-case';
import { GetSuggestionSettingsUseCase } from '../../application/use-cases/activity-suggestion/get-suggestion-settings.use-case';
import { UpdateSuggestionSettingsUseCase } from '../../application/use-cases/activity-suggestion/update-suggestion-settings.use-case';

export class ActivitySuggestionController {
  constructor(
    private readonly generateSuggestionsUseCase: GenerateSuggestionsUseCase,
    private readonly listSuggestionsUseCase: ListSuggestionsUseCase,
    private readonly acceptSuggestionUseCase: AcceptSuggestionUseCase,
    private readonly dismissSuggestionUseCase: DismissSuggestionUseCase,
    private readonly clearSuggestionHistoryUseCase: ClearSuggestionHistoryUseCase,
    private readonly getSuggestionSettingsUseCase: GetSuggestionSettingsUseCase,
    private readonly updateSuggestionSettingsUseCase: UpdateSuggestionSettingsUseCase,
  ) {}

  // Recalcula sugerencias pendientes a partir del historial actual. Separado
  // de `list` a propósito: el detector puede tardar un poco con historiales
  // grandes y el front no debe bloquear el formulario mientras corre (ver
  // spec) -- se dispara aparte y luego se listan las que ya quedaron.
  generate = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const created = await this.generateSuggestionsUseCase.execute(userId);
    res.status(200).json(created.map((suggestion) => suggestion.toJSON()));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const suggestions = await this.listSuggestionsUseCase.execute(userId);
    res.status(200).json(suggestions.map((suggestion) => suggestion.toJSON()));
  };

  accept = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }
    await this.acceptSuggestionUseCase.execute(userId, id, req.body);
    res.status(204).send();
  };

  dismiss = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ message: 'id route param is required' });
      return;
    }
    await this.dismissSuggestionUseCase.execute(userId, id);
    res.status(204).send();
  };

  clearHistory = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    await this.clearSuggestionHistoryUseCase.execute(userId);
    res.status(204).send();
  };

  getSettings = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const settings = await this.getSuggestionSettingsUseCase.execute(userId);
    res.status(200).json(settings);
  };

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const settings = await this.updateSuggestionSettingsUseCase.execute(userId, req.body);
    res.status(200).json(settings);
  };
}
