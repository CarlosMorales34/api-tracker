import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../application/use-cases/auth/login-user.use-case';
import { LoginWithGoogleUseCase } from '../../application/use-cases/auth/login-with-google.use-case';
import { RefreshAccessTokenUseCase } from '../../application/use-cases/auth/refresh-access-token.use-case';
import { UnauthorizedError } from '../../domain/errors/domain.error';
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE_NAME } from '../utils/auth-cookies';

export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly loginWithGoogleUseCase: LoginWithGoogleUseCase,
    private readonly refreshAccessTokenUseCase: RefreshAccessTokenUseCase,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const { user, accessToken, refreshToken } = await this.registerUserUseCase.execute(req.body);
    setRefreshTokenCookie(res, refreshToken);
    res.status(201).json({ user: user.toPublicJSON(), accessToken });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { user, accessToken, refreshToken } = await this.loginUserUseCase.execute(req.body);
    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json({ user: user.toPublicJSON(), accessToken });
  };

  google = async (req: Request, res: Response): Promise<void> => {
    const { user, accessToken, refreshToken } = await this.loginWithGoogleUseCase.execute(req.body.idToken);
    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json({ user: user.toPublicJSON(), accessToken });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedError('Refresh token faltante');
    }

    const { accessToken } = this.refreshAccessTokenUseCase.execute(token);
    res.status(200).json({ accessToken });
  };

  logout = async (_req: Request, res: Response): Promise<void> => {
    clearRefreshTokenCookie(res);
    res.status(204).send();
  };
}
