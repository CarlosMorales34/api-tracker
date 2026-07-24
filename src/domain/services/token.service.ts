export interface TokenPayload {
  id: string;
  email: string;
  name: string;
}

// Abstraction over JWT signing/verification. Infrastructure implements this
// with `jsonwebtoken`; application use-cases and presentation middlewares only
// depend on this interface.
export interface TokenService {
  signAccessToken(payload: TokenPayload): string;
  signRefreshToken(payload: TokenPayload): string;
  // Throws UnauthorizedError (domain) when the token is missing, expired, has a
  // bad signature, or isn't actually an access token.
  verifyAccessToken(token: string): TokenPayload;
  // Throws UnauthorizedError (domain) when the token is missing, expired, has a
  // bad signature, or isn't actually a refresh token.
  verifyRefreshToken(token: string): TokenPayload;
}
