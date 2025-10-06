import { Request } from 'express';
import mongoose from 'mongoose';
import { UserType } from '../../../shared/types/enums';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: UserType;
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
  userType: UserType;
}

export type AuthRequest = Request & {
  user?: {
    userId: string;
    userType: UserType;
  };
};
