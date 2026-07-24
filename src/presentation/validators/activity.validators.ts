import { z } from 'zod';

export const createActivitySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(150),
});
