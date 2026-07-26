import { User } from '../entities/user.entity';

export interface UserRepository {
  save(user: User): Promise<void>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  // Vincula google_id/avatar a una cuenta existente creada con password.
  linkGoogleAccount(userId: string, googleId: string, avatarUrl: string | null): Promise<void>;
}
