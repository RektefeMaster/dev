import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: string;
      };
    }
  }
}

export type AuthRequest = Request & {
  user?: {
    userId: string;
    userType: string;
  };
}; 