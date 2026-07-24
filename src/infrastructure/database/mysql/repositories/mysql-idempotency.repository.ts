import { Pool, RowDataPacket } from 'mysql2/promise';
import { IdempotencyRecord, IdempotencyRepository } from '../../../../domain/repositories/idempotency.repository';

interface IdempotencyRow extends RowDataPacket {
  idempotency_key: string;
  route: string;
  user_id: string | null;
  request_hash: string;
  response_status: number;
  response_body: unknown;
}

interface MysqlError {
  code?: string;
}

export class MysqlIdempotencyRepository implements IdempotencyRepository {
  constructor(private readonly pool: Pool) {}

  async findByKeyAndRoute(idempotencyKey: string, route: string): Promise<IdempotencyRecord | null> {
    const [rows] = await this.pool.query<IdempotencyRow[]>(
      'SELECT idempotency_key, route, user_id, request_hash, response_status, response_body FROM idempotency_keys WHERE idempotency_key = ? AND route = ? LIMIT 1',
      [idempotencyKey, route],
    );
    const [row] = rows;
    if (!row) return null;

    return {
      idempotencyKey: row.idempotency_key,
      route: row.route,
      userId: row.user_id,
      requestHash: row.request_hash,
      responseStatus: row.response_status,
      // mysql2 parses JSON columns into JS values automatically, but guard
      // against a raw string just in case the driver config changes.
      responseBody: typeof row.response_body === 'string' ? JSON.parse(row.response_body) : row.response_body,
    };
  }

  async save(record: IdempotencyRecord): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO idempotency_keys (idempotency_key, route, user_id, request_hash, response_status, response_body)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          record.idempotencyKey,
          record.route,
          record.userId,
          record.requestHash,
          record.responseStatus,
          JSON.stringify(record.responseBody),
        ],
      );
    } catch (error) {
      // Two concurrent requests with the same brand-new key can both reach
      // this insert; the PK (idempotency_key, route) rejects the loser, which
      // is fine — the winner's record is what future replays should see.
      if (this.isDuplicateKeyError(error)) return;
      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as MysqlError).code === 'ER_DUP_ENTRY';
  }
}
