import { z } from 'zod';

export const createMetricSchema = z.object({
  name: z.string().trim().min(1),
  unit: z.enum(['kg', 'lb', 'cm', 'min', 'reps', 'count', 'percent', 'custom']),
});
