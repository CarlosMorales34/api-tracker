import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { ExerciseCatalogController } from '../controllers/exercise-catalog.controller';
import { validateBody } from '../middlewares/validate.middleware';

export function exerciseCatalogRoutes(controller: ExerciseCatalogController, authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate);
  const name = z.object({ name: z.string().trim().min(1).max(255) });
  router.get('/', controller.list);
  router.post('/', validateBody(name), controller.create);
  router.put('/:id', validateBody(name), controller.rename);
  router.post('/:id/merge', validateBody(z.object({ targetId: z.string().uuid() })), controller.merge);
  return router;
}
