import bcrypt from 'bcryptjs';
import { PasswordHasher } from '../../domain/services/password-hasher.service';

const SALT_ROUNDS = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  readonly dummyHash: string;

  constructor() {
    // Computed once at startup — a valid bcrypt hash with no real matching
    // password, used by LoginUserUseCase to keep compare() cost constant when
    // the email doesn't exist.
    this.dummyHash = bcrypt.hashSync('vitalis-timing-attack-mitigation-dummy', SALT_ROUNDS);
  }

  hash(plainTextPassword: string): Promise<string> {
    return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
  }

  compare(plainTextPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, passwordHash);
  }
}
