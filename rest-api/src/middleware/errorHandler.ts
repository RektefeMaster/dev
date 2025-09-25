import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Geçersiz ID formatı';
    error = new CustomError(message, 400);
  }

  // Mongoose duplicate key
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const message = 'Bu veri zaten mevcut';
    error = new CustomError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors).map((val: any) => val.message).join(', ');
    error = new CustomError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Geçersiz token';
    error = new CustomError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token süresi dolmuş';
    error = new CustomError(message, 401);
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Sunucu hatası';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found middleware
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(`Endpoint bulunamadı: ${req.originalUrl}`, 404);
  next(error);
};
