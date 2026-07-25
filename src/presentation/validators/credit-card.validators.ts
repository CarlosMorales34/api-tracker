import { z } from 'zod';

export const createCreditCardSchema = z.object({
  name: z.string().trim().min(1).max(150),
  creditLimit: z.number().positive(),
  dueDay: z.number().int().min(1).max(31),
  amountOwed: z.number().min(0).optional(),
});

export const updateCreditCardSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  creditLimit: z.number().positive().optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  amountOwed: z.number().min(0).optional(),
});
