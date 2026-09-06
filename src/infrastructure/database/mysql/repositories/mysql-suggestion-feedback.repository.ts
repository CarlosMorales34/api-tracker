import { Pool, RowDataPacket } from 'mysql2/promise';
import { SuggestionFeedback, SuggestionFeedbackAction } from '../../../../domain/entities/suggestion-feedback.entity';
import { SuggestionFeedbackRepository } from '../../../../domain/repositories/suggestion-feedback.repository';

interface SuggestionFeedbackRow extends RowDataPacket {
  id: string;
  suggestion_id: string;
  user_id: string;
  action: SuggestionFeedbackAction;
  original_values: string | Record<string, unknown>;
  final_values: string | Record<string, unknown> | null;
  created_at: Date;
}

function parseJsonColumn(value: string | Record<string, unknown>): Record<string, unknown> {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

export class MysqlSuggestionFeedbackRepository implements SuggestionFeedbackRepository {
  constructor(private readonly pool: Pool) {}

  async save(feedback: SuggestionFeedback): Promise<void> {
    await this.pool.query(
      `INSERT INTO suggestion_feedback (id, suggestion_id, user_id, action, original_values, final_values)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        feedback.id,
        feedback.suggestionId,
        feedback.userId,
        feedback.action,
        JSON.stringify(feedback.originalValues),
        feedback.finalValues === null ? null : JSON.stringify(feedback.finalValues),
      ],
    );
  }

  async findRecentCorrectionsForTarget(
    userId: string,
    target: { activityId: string | null; routineId: string | null },
    limit: number,
  ): Promise<SuggestionFeedback[]> {
    const [rows] = await this.pool.query<SuggestionFeedbackRow[]>(
      `SELECT sf.* FROM suggestion_feedback sf
       INNER JOIN activity_suggestions asug ON asug.id = sf.suggestion_id
       WHERE sf.user_id = ? AND sf.action = 'accepted_with_changes'
         AND asug.activity_id <=> ? AND asug.routine_id <=> ?
       ORDER BY sf.created_at ASC
       LIMIT ?`,
      [userId, target.activityId, target.routineId, limit],
    );
    return rows.map((row) => ({
      id: row.id,
      suggestionId: row.suggestion_id,
      userId: row.user_id,
      action: row.action,
      originalValues: parseJsonColumn(row.original_values),
      finalValues: row.final_values === null ? null : parseJsonColumn(row.final_values),
      createdAt: row.created_at,
    }));
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM suggestion_feedback WHERE user_id = ?', [userId]);
  }
}
