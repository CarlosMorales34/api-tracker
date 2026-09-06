import { randomUUID } from 'node:crypto';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { UserModuleSettingsRepository } from '../../../domain/repositories/user-module-settings.repository';
import { DEFAULT_USER_MODULE_SETTINGS } from '../../../domain/entities/user-module-settings.entity';
import { PasswordHasher } from '../../../domain/services/password-hasher.service';
import { TokenService } from '../../../domain/services/token.service';
import { ConflictError } from '../../../domain/errors/domain.error';
import { RegisterUserDto } from '../../dtos/register-user.dto';

export interface RegisterUserResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly userModuleSettingsRepository: UserModuleSettingsRepository,
  ) {}

  async execute(dto: RegisterUserDto): Promise<RegisterUserResult> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('User', dto.email);
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = User.create({ id: randomUUID(), email: dto.email, passwordHash, name: dto.name });

    // Backstop against the race where two requests with the same new email
    // pass the findByEmail check concurrently — the DB unique constraint on
    // users.email wins, and the repository translates it into ConflictError.
    await this.userRepository.save(user);
    // Los dominios se eligen en el onboarding (ya logueado, ver
    // ModuleSelectionModal en el front), no al registrarse -- arranca con
    // los 3 habilitados y PUT /api/users/modules los ajusta después.
    await this.userModuleSettingsRepository.upsert(user.id, DEFAULT_USER_MODULE_SETTINGS);

    const accessToken = this.tokenService.signAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = this.tokenService.signRefreshToken({ id: user.id, email: user.email, name: user.name });

    return { user, accessToken, refreshToken };
  }
}
