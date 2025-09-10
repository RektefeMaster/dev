import { Request } from 'express';
import mongoose from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: 'driver' | 'mechanic';
      };
    }
  }
}

export interface IBaseUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  surname: string;
  email: string;
  password: string;
}

export interface IAuthUser extends IBaseUser {
  userType: 'driver' | 'mechanic';
}

export type AuthRequest = Request & {
  user?: {
    userId: string;
    userType: 'driver' | 'mechanic';
  };
};
