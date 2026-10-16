import { ExerciseCatalogRepository } from '../../../domain/repositories/exercise-catalog.repository';

export class ManageExerciseCatalogUseCase {
  constructor(private readonly repository: ExerciseCatalogRepository) {}
  list(userId: string) { return this.repository.list(userId); }
  create(userId: string, name: string) { return this.repository.create(userId, name); }
  rename(userId: string, id: string, name: string) { return this.repository.rename(userId, id, name); }
  merge(userId: string, id: string, targetId: string) { return this.repository.merge(userId, id, targetId); }
}
