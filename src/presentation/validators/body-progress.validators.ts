import { z } from 'zod';

const metricSchema = z.number().nullable().optional();

export const createBodyMeasurementSchema = z.object({
  measuredAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/)),
  weightKg: metricSchema,
  bodyFatPercentage: metricSchema,
  waistCm: metricSchema,
  chestCm: metricSchema,
  hipsCm: metricSchema,
  notes: z.string().max(2000).nullable().optional(),
});

export const updateBodyMeasurementSchema = createBodyMeasurementSchema.partial();

export const setBodyGoalSchema = z
  .object({
    goalType: z.enum(['lose', 'gain', 'maintain', 'recomp']),
    startWeightKg: z.number().positive(),
    targetWeightKg: z.number().positive().nullable().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
  })
  .refine((data) => (data.goalType === 'lose' || data.goalType === 'gain' ? !!data.targetWeightKg : true), {
    message: 'targetWeightKg es requerido para objetivos de bajar/subir de peso',
  });
