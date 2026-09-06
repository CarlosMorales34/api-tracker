import { z } from 'zod';

export const acceptSuggestionSchema = z.object({
  finalValues: z.record(z.string(), z.unknown()).optional(),
});

export const updateSuggestionSettingsSchema = z.object({
  suggestionsEnabled: z.boolean(),
});
