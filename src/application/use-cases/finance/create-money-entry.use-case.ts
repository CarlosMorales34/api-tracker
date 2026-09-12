import { randomUUID } from 'node:crypto';
import { DEFAULT_FINANCE_SETTINGS } from '../../../domain/entities/finance-settings.entity';
import { MoneyEntry } from '../../../domain/entities/money-entry.entity';
import { MoneyEntryRepository } from '../../../domain/repositories/money-entry.repository';
import { FinanceSettingsRepository } from '../../../domain/repositories/finance-settings.repository';
import { CreateMoneyEntryDto } from '../../dtos/create-money-entry.dto';

export class CreateMoneyEntryUseCase {
  constructor(
    private readonly moneyEntryRepository: MoneyEntryRepository,
    private readonly financeSettingsRepository: FinanceSettingsRepository,
  ) {}

  async execute(userId: string, dto: CreateMoneyEntryDto): Promise<MoneyEntry> {
    const settings = (await this.financeSettingsRepository.find(userId)) ?? DEFAULT_FINANCE_SETTINGS;
    const entry = MoneyEntry.create({
      id: randomUUID(),
      userId,
      type: dto.type,
      name: dto.name,
      amount: dto.amount,
      recurrence: dto.recurrence,
      weekStartDate: dto.weekStartDate,
      // Moneda vigente AHORA -- queda fija en esta entrada aunque el usuario
      // cambie de moneda después (ver domain/entities/money-entry.entity.ts).
      currency: settings.currency,
    });

    await this.moneyEntryRepository.save(entry);
    // Solo ingresos ajustan la cartera -- gastos "Finanzas" ya no existen de
    // cara al usuario, pero si algún registro viejo type=expense llegara acá
    // (no hay UI para crearlo), no debe tocar el saldo.
    if (entry.type === 'income') {
      await this.financeSettingsRepository.adjustWalletBalance(userId, entry.amount);
    }
    return entry;
  }
}
