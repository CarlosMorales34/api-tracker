export interface IdempotencyRecord {
  idempotencyKey: string;
  route: string;
  userId: string | null;
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
}

export interface IdempotencyRepository {
  findByKeyAndRoute(idempotencyKey: string, route: string): Promise<IdempotencyRecord | null>;
  save(record: IdempotencyRecord): Promise<void>;
}
