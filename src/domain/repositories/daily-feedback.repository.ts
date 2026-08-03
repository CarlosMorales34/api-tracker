export interface DailyFeedbackRepository {
  find(userId: string, logDate: string): Promise<string | null>;
  upsert(userId: string, logDate: string, note: string): Promise<void>;
}
