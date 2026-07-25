import { z } from 'zod';

const moneyEntryRecurrenceSchema = z.enum(['unique', 'weekly', 'biweekly', 'monthly', 'yearly']);

export const createMoneyEntrySchema = z.object({
  type: z.enum(['income', 'expense']),
  name: z.string().trim().min(1).max(150),
  amount: z.number().positive(),
  recurrence: moneyEntryRecurrenceSchema.default('unique'),
  weekStartDate: z.string().date(),
});

export const updateMoneyEntrySchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  amount: z.number().positive().optional(),
  recurrence: moneyEntryRecurrenceSchema.optional(),
});

export const updateFinanceSettingsSchema = z.object({
  debtTotal: z.number().min(0).optional(),
  currency: z.enum(['MXN', 'USD']).optional(),
  week1AnchorDate: z.string().date().nullable().optional(),
});

export const createDebtPaymentSchema = z.object({
  weekStartDate: z.string().date(),
  amount: z.number().positive(),
});

export const createSavingsEntrySchema = z.object({
  weekStartDate: z.string().date(),
  amount: z.number().positive(),
});

export const putFinanceAnnualIncomeSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  amount: z.number().positive(),
});

export const setWalletBalanceSchema = z.object({
  balance: z.number(),
});
