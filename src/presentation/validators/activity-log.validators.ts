import { z } from 'zod';

export const putActivityLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  hours: z.number().positive().max(24).nullable(),
});
