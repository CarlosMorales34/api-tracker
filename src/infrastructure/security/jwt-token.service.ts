import jwt from 'jsonwebtoken';
import { TokenPayload, TokenService } from '../../domain/services/token.service';
import { UnauthorizedError } from '../../domain/errors/domain.error';

type TokenType = 'access' | 'refresh';

interface JwtClaims extends TokenPayload {
  type: TokenType;
}

const INVALID_TOKEN_MESSAGE = 'Token inválido o expirado';

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly accessExpiresIn: string,
    private readonly refreshExpiresIn: string,
  ) {}

  signAccessToken(payload: TokenPayload): string {
    return this.sign(payload, 'access', this.accessExpiresIn);
  }

  signRefreshToken(payload: TokenPayload): string {
    return this.sign(payload, 'refresh', this.refreshExpiresIn);
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.verify(token, 'access');
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.verify(token, 'refresh');
  }

  private sign(payload: TokenPayload, type: TokenType, expiresIn: string): string {
    const claims: JwtClaims = { id: payload.id, email: payload.email, name: payload.name, type };
    return jwt.sign(claims, this.secret, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
  }

  private verify(token: string, expectedType: TokenType): TokenPayload {
    let decoded: JwtClaims;
    try {
      decoded = jwt.verify(token, this.secret) as JwtClaims;
    } catch {
      throw new UnauthorizedError(INVALID_TOKEN_MESSAGE);
    }

    // Reject an access token used as a refresh token (or vice versa) even
    // though both are signed with the same secret.
    if (decoded.type !== expectedType) {
      throw new UnauthorizedError(INVALID_TOKEN_MESSAGE);
    }

    return { id: decoded.id, email: decoded.email, name: decoded.name };
  }
}
