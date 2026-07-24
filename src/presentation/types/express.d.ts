import 'express';

declare global {
  namespace Express {
    interface Request {
      // Set by the `authenticate` middleware after verifying the access token.
      user?: { id: string; email: string };
    }
  }
}

export {};
