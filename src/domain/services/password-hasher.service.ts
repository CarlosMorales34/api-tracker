// Abstraction over the hashing algorithm — application/use-cases depend on this
// contract, never on bcrypt directly, so the implementation can be swapped
// (e.g. bcrypt <-> argon2) without touching business logic.
export interface PasswordHasher {
  hash(plainTextPassword: string): Promise<string>;
  compare(plainTextPassword: string, passwordHash: string): Promise<boolean>;
  // Precomputed, valid hash with no matching real password. Used by LoginUserUseCase
  // to run a bcrypt.compare of consistent cost even when the email doesn't exist,
  // so response time doesn't leak whether the account exists (timing attack / user
  // enumeration mitigation).
  readonly dummyHash: string;
}
