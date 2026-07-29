import { z } from 'zod';

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM');

export const putActivityLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  times: z.array(z.object({ start: timeOfDaySchema, end: timeOfDaySchema })).max(8),
});
