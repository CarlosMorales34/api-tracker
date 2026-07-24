import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { PasswordHasher } from '../../../domain/services/password-hasher.service';
import { TokenService } from '../../../domain/services/token.service';
import { UnauthorizedError } from '../../../domain/errors/domain.error';
import { LoginUserDto } from '../../dtos/login-user.dto';

export interface LoginUserResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

const INVALID_CREDENTIALS_MESSAGE = 'Credenciales inválidas';

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(dto: LoginUserDto): Promise<LoginUserResult> {
    const user = await this.userRepository.findByEmail(dto.email);

    // Always run bcrypt.compare — against the real hash if the user exists,
    // against a precomputed dummy hash of the same cost otherwise — so a
    // missing email and a wrong password take the same amount of time and the
    // response can't be used to enumerate registered emails.
    const hashToCompare = user ? user.passwordHash : this.passwordHasher.dummyHash;
    const passwordMatches = await this.passwordHasher.compare(dto.password, hashToCompare);

    if (!user || !passwordMatches) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const accessToken = this.tokenService.signAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = this.tokenService.signRefreshToken({ id: user.id, email: user.email, name: user.name });

    return { user, accessToken, refreshToken };
  }
}
