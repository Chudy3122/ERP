import { JWTPayload } from '../utils/jwt.utils';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export {};
