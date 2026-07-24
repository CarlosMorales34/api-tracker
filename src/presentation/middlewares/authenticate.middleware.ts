import { NextFunction, Request, RequestHandler, Response } from 'express';
import { TokenService } from '../../domain/services/token.service';
import { UnauthorizedError } from '../../domain/errors/domain.error';

const BEARER_PREFIX = 'Bearer ';

// Validates `Authorization: Bearer <accessToken>` and attaches req.user.
// Throws synchronously on failure — Express forwards sync throws from
// middleware to the error handler automatically, which maps UnauthorizedError
// to 401, so no try/catch is needed here.
export function authenticate(tokenService: TokenService): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedError('Token de acceso requerido');
    }

    const token = header.slice(BEARER_PREFIX.length);
    const payload = tokenService.verifyAccessToken(token);
    req.user = { id: payload.id, email: payload.email };
    next();
  };
}
