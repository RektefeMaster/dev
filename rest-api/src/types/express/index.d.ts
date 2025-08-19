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

// AuthRequest interface'i ekleyelim
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: string;
    name?: string;
    email?: string;
  };
} 