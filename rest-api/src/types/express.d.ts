import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: string;
        name?: string;
        email?: string;
      };
    }
  }
}

// AuthRequest interface'i
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: string;
    name?: string;
    email?: string;
  };
} 