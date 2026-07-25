import { z } from 'zod';

export const createFixedRoutineSchema = z.object({
  name: z.string().trim().min(1).max(150),
  icon: z.string().trim().min(1).max(30),
  type: z.enum(['single', 'range']),
});

export const updateFixedRoutineSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  icon: z.string().trim().min(1).max(30).optional(),
  type: z.enum(['single', 'range']).optional(),
});

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM');

export const putRoutineLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  times: z
    .array(z.object({ start: timeOfDaySchema, end: timeOfDaySchema.nullable().optional() }))
    .max(8),
});
