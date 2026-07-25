import { z } from 'zod';

const workoutExerciseSchema = z.object({
  name: z.string().max(255),
  weight: z.number().nonnegative().nullable(),
  sets: z.number().int().min(1).max(50),
  reps: z.array(z.number().int().nonnegative()).min(1).max(50),
});

export const createWorkoutSchema = z.object({
  workoutDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  durationSeconds: z.number().int().nonnegative(),
  comments: z.string().max(2000).nullable(),
  exercises: z.array(workoutExerciseSchema).min(1).max(30),
});
