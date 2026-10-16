export interface CatalogExercise {
  id: string;
  name: string;
  aliases: string[];
  recordCount: number;
}

export interface ExerciseCatalogRepository {
  list(userId: string): Promise<CatalogExercise[]>;
  create(userId: string, name: string): Promise<CatalogExercise>;
  rename(userId: string, id: string, name: string): Promise<void>;
  merge(userId: string, sourceId: string, targetId: string): Promise<void>;
}
