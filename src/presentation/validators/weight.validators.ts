import { z } from 'zod';

export const putWeightMonthSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  value: z.number().finite().nullable(),
});

export const putWeightMonthNoteSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  note: z.string().max(2000),
});

export const putWeightSettingsSchema = z.object({
  goalKg: z.number().positive(),
  goalDirection: z.enum(['lose', 'gain']),
});
