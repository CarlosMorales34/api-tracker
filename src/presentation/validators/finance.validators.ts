import { z } from 'zod';

export const createMoneyEntrySchema = z.object({
  type: z.enum(['income', 'expense']),
  name: z.string().trim().min(1).max(150),
  amount: z.number().positive(),
  weekStartDate: z.string().date(),
});

export const updateMoneyEntrySchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  amount: z.number().positive().optional(),
});

export const updateFinanceSettingsSchema = z.object({
  debtTotal: z.number().min(0).optional(),
  currency: z.enum(['MXN', 'USD']).optional(),
});

export const createDebtPaymentSchema = z.object({
  weekStartDate: z.string().date(),
  amount: z.number().positive(),
});

export const createSavingsEntrySchema = z.object({
  weekStartDate: z.string().date(),
  amount: z.number().positive(),
});
