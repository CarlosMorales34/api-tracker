import { z } from 'zod';

export const updateUserModulesSchema = z
  .object({
    hasActivities: z.boolean(),
    hasFinance: z.boolean(),
    hasHealth: z.boolean(),
  })
  .refine((modules) => modules.hasActivities || modules.hasFinance || modules.hasHealth, {
    message: 'Debes tener al menos un dominio habilitado',
  });
