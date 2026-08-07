import { z } from 'zod';

const workoutRoutineExerciseSchema = z.object({
  name: z.string().max(255),
  targetSets: z.number().int().min(1).max(50),
  targetReps: z.number().int().min(1).max(100),
  suggestedWeight: z.number().nonnegative().nullable(),
});

export const createWorkoutRoutineSchema = z.object({
  name: z.string().trim().min(1).max(150),
  // 0=domingo..6=sábado (Date#getDay()) -- null = sin asociar a un día en
  // particular, la rutina sigue disponible en el selector manual.
  weekday: z.number().int().min(0).max(6).nullable(),
  exercises: z.array(workoutRoutineExerciseSchema).min(1).max(30),
});

export const updateWorkoutRoutineSchema = createWorkoutRoutineSchema;
