import { describe, expect, it, vi } from 'vitest';
import { UpdateFinanceSettingsUseCase } from './update-finance-settings.use-case';
import { DomainError } from '../../../domain/errors/domain.error';

function makeRepo() {
  return { find: vi.fn(), upsert: vi.fn().mockResolvedValue({}) } as any;
}

describe('UpdateFinanceSettingsUseCase', () => {
  it('acepta un week1AnchorDate que cae en sábado', async () => {
    const repo = makeRepo();
    const useCase = new UpdateFinanceSettingsUseCase(repo);
    await useCase.execute('user-1', { week1AnchorDate: '2026-09-05' }); // sábado real
    expect(repo.upsert).toHaveBeenCalledWith('user-1', { week1AnchorDate: '2026-09-05' });
  });

  it('rechaza un week1AnchorDate que NO cae en sábado', async () => {
    const repo = makeRepo();
    const useCase = new UpdateFinanceSettingsUseCase(repo);
    await expect(useCase.execute('user-1', { week1AnchorDate: '2026-09-10' })).rejects.toThrow(DomainError); // jueves
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('null/undefined no dispara la validación (permite borrar el ancla)', async () => {
    const repo = makeRepo();
    const useCase = new UpdateFinanceSettingsUseCase(repo);
    await useCase.execute('user-1', { week1AnchorDate: null });
    expect(repo.upsert).toHaveBeenCalled();
  });
});
