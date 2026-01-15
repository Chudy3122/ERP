// Express type extensions - must be in .ts file for ts-node to load it
import { JWTPayload } from '../utils/jwt.utils';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export {};
