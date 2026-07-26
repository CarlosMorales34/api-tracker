import { Pool, RowDataPacket } from 'mysql2/promise';
import { User } from '../../../../domain/entities/user.entity';
import { UserRepository } from '../../../../domain/repositories/user.repository';
import { ConflictError } from '../../../../domain/errors/domain.error';

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  google_id: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

interface MysqlError {
  code?: string;
}

export class MysqlUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async save(user: User): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO users (id, email, password_hash, name, google_id, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.email,
          user.passwordHash,
          user.name,
          user.googleId,
          user.avatarUrl,
          user.createdAt,
          user.updatedAt,
        ],
      );
    } catch (error) {
      // Race backstop: two concurrent registers with the same new email can
      // both pass the use case's findByEmail check; the DB unique constraint
      // is the real guard, translated here into the same domain error.
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictError('User', user.email);
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await this.pool.query<UserRow[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [
      email.trim().toLowerCase(),
    ]);
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const [rows] = await this.pool.query<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const [rows] = await this.pool.query<UserRow[]>('SELECT * FROM users WHERE google_id = ? LIMIT 1', [googleId]);
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async linkGoogleAccount(userId: string, googleId: string, avatarUrl: string | null): Promise<void> {
    await this.pool.query('UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?', [
      googleId,
      avatarUrl,
      userId,
    ]);
  }

  private isDuplicateEmailError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as MysqlError).code === 'ER_DUP_ENTRY';
  }

  private toEntity(row: UserRow): User {
    return User.fromPersistence({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      googleId: row.google_id,
      avatarUrl: row.avatar_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
