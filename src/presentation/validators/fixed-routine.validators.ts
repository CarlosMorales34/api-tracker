import { z } from 'zod';

export const createFixedRoutineSchema = z.object({
  name: z.string().trim().min(1).max(150),
  icon: z.string().trim().min(1).max(30),
  type: z.enum(['single', 'range']),
});
