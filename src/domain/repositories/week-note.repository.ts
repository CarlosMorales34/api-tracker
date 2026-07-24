export interface WeekNoteRepository {
  find(userId: string, year: number, weekNumber: number): Promise<string | null>;
  upsert(userId: string, year: number, weekNumber: number, notes: string): Promise<void>;
}
