import { z } from 'zod';

export const createDailyExpenseSchema = z.object({
  name: z.string().trim().min(1).max(150),
  amount: z.number().positive(),
  expenseDate: z.string().date(),
});

export const updateDailyExpenseSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  amount: z.number().positive().optional(),
});

export const createFixedMonthlyExpenseSchema = z.object({
  name: z.string().trim().min(1).max(150),
  amount: z.number().positive(),
});

export const updateFixedMonthlyExpenseSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  amount: z.number().positive().optional(),
});
