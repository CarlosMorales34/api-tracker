import { TokenService } from '../../../domain/services/token.service';

export class RefreshAccessTokenUseCase {
  constructor(private readonly tokenService: TokenService) {}

  execute(refreshToken: string): { accessToken: string } {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const accessToken = this.tokenService.signAccessToken({ id: payload.id, email: payload.email, name: payload.name });
    return { accessToken };
  }
}
