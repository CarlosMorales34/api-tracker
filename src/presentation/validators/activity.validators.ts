import { z } from 'zod';

export const createActivitySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(150),
});

export const reorderActivitiesSchema = z.object({
  categoryId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const putDailyFeedbackSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  note: z.string().max(5000),
});
