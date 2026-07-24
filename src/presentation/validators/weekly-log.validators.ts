import { z } from 'zod';

export const putWeekNotesSchema = z.object({
  notes: z.string().max(5000),
});

export const createAnnualCounterSchema = z.object({
  name: z.string().trim().min(1).max(150),
  year: z.number().int().min(2000).max(2100),
  value: z.number().int().min(0),
});
