import { randomUUID } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { TokenService } from '../../../domain/services/token.service';
import { UnauthorizedError } from '../../../domain/errors/domain.error';

export interface LoginWithGoogleResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

const INVALID_GOOGLE_TOKEN_MESSAGE = 'Token de Google inválido';

// Verifica el ID token de Google Identity Services (sin intercambio de
// código, sin client secret) y resuelve a un usuario: lo busca por
// google_id, si no existe pero el correo ya está registrado con password lo
// vincula automáticamente (Google ya verificó ese correo), y si no existe en
// absoluto crea una cuenta nueva sin password.
export class LoginWithGoogleUseCase {
  private readonly client: OAuth2Client;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly googleClientId: string,
  ) {
    this.client = new OAuth2Client(googleClientId);
  }

  async execute(idToken: string): Promise<LoginWithGoogleResult> {
    const payload = await this.verifyToken(idToken);
    const googleId = payload.sub;
    const email = payload.email!;
    const name = payload.name ?? email;
    const avatarUrl = payload.picture ?? null;

    let user = await this.userRepository.findByGoogleId(googleId);

    if (!user) {
      const existingByEmail = await this.userRepository.findByEmail(email);
      if (existingByEmail) {
        await this.userRepository.linkGoogleAccount(existingByEmail.id, googleId, avatarUrl);
        user = existingByEmail.withLinkedGoogleAccount(googleId, avatarUrl);
      } else {
        user = User.createFromGoogle({ id: randomUUID(), email, name, googleId, avatarUrl });
        await this.userRepository.save(user);
      }
    }

    const accessToken = this.tokenService.signAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = this.tokenService.signRefreshToken({ id: user.id, email: user.email, name: user.name });

    return { user, accessToken, refreshToken };
  }

  private async verifyToken(idToken: string) {
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: this.googleClientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedError(INVALID_GOOGLE_TOKEN_MESSAGE);
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedError(INVALID_GOOGLE_TOKEN_MESSAGE);
    }
    if (!payload.email_verified) {
      throw new UnauthorizedError('El correo de Google no está verificado');
    }

    return payload;
  }
}
