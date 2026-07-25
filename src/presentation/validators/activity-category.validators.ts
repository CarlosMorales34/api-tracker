import { z } from 'zod';

export const createActivityCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const reorderActivityCategoriesSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
