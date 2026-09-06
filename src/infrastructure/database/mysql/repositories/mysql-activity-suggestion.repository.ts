import { Pool, RowDataPacket } from 'mysql2/promise';
import {
  ActivitySuggestion,
  ActivitySuggestionProps,
  SuggestionStatus,
  SuggestionType,
} from '../../../../domain/entities/activity-suggestion.entity';
import { ActivitySuggestionRepository, SuggestionTarget } from '../../../../domain/repositories/activity-suggestion.repository';

interface ActivitySuggestionRow extends RowDataPacket {
  id: string;
  user_id: string;
  suggestion_type: SuggestionType;
  activity_id: string | null;
  category_id: string | null;
  routine_id: string | null;
  suggested_activity_name: string | null;
  suggested_category_id: string | null;
  suggested_days: string | number[] | null;
  suggested_start_time: string | null;
  suggested_end_time: string | null;
  suggested_duration_minutes: number | null;
  suggested_start_date: string | null;
  suggested_end_date: string | null;
  confidence: number;
  sample_count: number;
  distinct_weeks: number;
  reason: string;
  status: SuggestionStatus;
  created_at: Date;
  updated_at: Date;
  expires_at: Date | null;
}

// mysql2 ya deserializa columnas JSON a objetos JS en la mayoría de los
// casos, pero esto es defensivo por si el driver la devuelve como string
// crudo bajo alguna configuración.
function parseDays(value: string | number[] | null): number[] | null {
  if (value === null) return null;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toEntity(row: ActivitySuggestionRow): ActivitySuggestion {
  const props: ActivitySuggestionProps = {
    id: row.id,
    userId: row.user_id,
    suggestionType: row.suggestion_type,
    activityId: row.activity_id,
    categoryId: row.category_id,
    routineId: row.routine_id,
    suggestedActivityName: row.suggested_activity_name,
    suggestedCategoryId: row.suggested_category_id,
    suggestedDays: parseDays(row.suggested_days),
    suggestedStartTime: row.suggested_start_time ? row.suggested_start_time.slice(0, 5) : null,
    suggestedEndTime: row.suggested_end_time ? row.suggested_end_time.slice(0, 5) : null,
    suggestedDurationMinutes: row.suggested_duration_minutes,
    suggestedStartDate: row.suggested_start_date,
    suggestedEndDate: row.suggested_end_date,
    confidence: row.confidence,
    sampleCount: row.sample_count,
    distinctWeeks: row.distinct_weeks,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
  return ActivitySuggestion.fromPersistence(props);
}

export class MysqlActivitySuggestionRepository implements ActivitySuggestionRepository {
  constructor(private readonly pool: Pool) {}

  async save(suggestion: ActivitySuggestion): Promise<void> {
    const json = suggestion.toJSON();
    await this.pool.query(
      `INSERT INTO activity_suggestions (
         id, user_id, suggestion_type, activity_id, category_id, routine_id,
         suggested_activity_name, suggested_category_id, suggested_days,
         suggested_start_time, suggested_end_time, suggested_duration_minutes,
         suggested_start_date, suggested_end_date, confidence, sample_count,
         distinct_weeks, reason, status, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        json.id,
        suggestion.userId,
        json.suggestionType,
        json.activityId,
        json.categoryId,
        json.routineId,
        json.suggestedActivityName,
        json.suggestedCategoryId,
        json.suggestedDays === null ? null : JSON.stringify(json.suggestedDays),
        json.suggestedStartTime,
        json.suggestedEndTime,
        json.suggestedDurationMinutes,
        json.suggestedStartDate,
        json.suggestedEndDate,
        json.confidence,
        json.sampleCount,
        json.distinctWeeks,
        json.reason,
        json.status,
        json.expiresAt,
      ],
    );
  }

  async findById(id: string): Promise<ActivitySuggestion | null> {
    const [rows] = await this.pool.query<ActivitySuggestionRow[]>(
      'SELECT * FROM activity_suggestions WHERE id = ? LIMIT 1',
      [id],
    );
    const [row] = rows;
    return row ? toEntity(row) : null;
  }

  async findPendingByUser(userId: string): Promise<ActivitySuggestion[]> {
    const [rows] = await this.pool.query<ActivitySuggestionRow[]>(
      `SELECT * FROM activity_suggestions WHERE user_id = ? AND status = 'pending'
       ORDER BY confidence DESC, created_at DESC`,
      [userId],
    );
    return rows.map(toEntity);
  }

  async findPendingDuplicate(userId: string, target: SuggestionTarget): Promise<ActivitySuggestion | null> {
    // <=> es el operador NULL-safe de MySQL -- necesario porque
    // activity_id/routine_id/category_id son nullable según el tipo de
    // sugerencia, y `= NULL` nunca es verdadero en SQL estándar.
    const [rows] = await this.pool.query<ActivitySuggestionRow[]>(
      `SELECT * FROM activity_suggestions
       WHERE user_id = ? AND status = 'pending' AND suggestion_type = ?
         AND activity_id <=> ? AND routine_id <=> ? AND category_id <=> ?
       LIMIT 1`,
      [userId, target.suggestionType, target.activityId, target.routineId, target.categoryId],
    );
    const [row] = rows;
    return row ? toEntity(row) : null;
  }

  async countRecentByStatusForTarget(
    userId: string,
    target: Pick<SuggestionTarget, 'suggestionType' | 'activityId' | 'routineId'>,
    statuses: SuggestionStatus[],
    sinceDate: Date,
  ): Promise<number> {
    if (statuses.length === 0) return 0;
    interface CountRow extends RowDataPacket {
      count: number;
    }
    const [rows] = await this.pool.query<CountRow[]>(
      `SELECT COUNT(*) AS count FROM activity_suggestions
       WHERE user_id = ? AND suggestion_type = ? AND activity_id <=> ? AND routine_id <=> ?
         AND status IN (?) AND created_at >= ?`,
      [userId, target.suggestionType, target.activityId, target.routineId, statuses, sinceDate],
    );
    return rows[0]?.count ?? 0;
  }

  async updateStatus(id: string, status: SuggestionStatus): Promise<void> {
    await this.pool.query('UPDATE activity_suggestions SET status = ? WHERE id = ?', [status, id]);
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM activity_suggestions WHERE user_id = ?', [userId]);
  }
}
