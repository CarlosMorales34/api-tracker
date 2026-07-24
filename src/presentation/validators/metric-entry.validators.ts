import { z } from 'zod';

export const logMetricEntrySchema = z.object({
  metricId: z.string().uuid(),
  value: z.number().finite(),
  recordedAt: z.string().datetime().optional(),
  note: z.string().max(280).optional(),
});
