import { describe, expect, it, vi } from 'vitest';
import { ActivitySuggestion } from '../../../domain/entities/activity-suggestion.entity';
import { AcceptSuggestionUseCase } from './accept-suggestion.use-case';

describe('suggestion feedback classification', () => {
  it.each([
    [{ logDate: '2026-10-01', suggestedStartTime: '08:00' }, 'accepted'],
    [{ logDate: '2026-10-01', suggestedStartTime: '09:00' }, 'accepted_with_changes'],
  ] as const)('distinguishes recording metadata from an actual time correction', async (finalValues, action) => {
    const suggestion = ActivitySuggestion.create({ id: 'suggestion', userId: 'user', suggestionType: 'fill_activity_fields',
      suggestedStartTime: '08:00', confidence: 0.8, sampleCount: 20, distinctWeeks: 4, reason: 'Observed pattern' });
    const save = vi.fn();
    const args = [
      { findById: async () => suggestion, updateStatus: vi.fn() }, { save }, {}, {}, {}, {},
    ] as unknown as ConstructorParameters<typeof AcceptSuggestionUseCase>;
    await new AcceptSuggestionUseCase(...args).execute('user', 'suggestion', { finalValues });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ action }));
  });
});
