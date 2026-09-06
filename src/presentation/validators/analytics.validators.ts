import { z } from 'zod';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const analyticsSummaryQuerySchema = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'from must be before or equal to to',
    path: ['from'],
  });
