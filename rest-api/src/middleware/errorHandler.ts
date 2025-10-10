import { Request, Response, NextFunction } from 'express';
import { 
  ErrorCode, 
  ERROR_MESSAGES_TR, 
  ERROR_STATUS_MAPPING, 
  createErrorResponse,
  ApiResponse 
} from '../../../shared/types/apiResponse';
import { logger } from '../utils/monitoring';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode: ErrorCode;

  constructor(message: string, statusCode: number = 500, errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
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

  // Log error using Winston logger
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const errorResponse = createErrorResponse(
      ErrorCode.INVALID_INPUT_FORMAT,
      'Geçersiz ID formatı',
      { field: 'id' },
      req.headers['x-request-id'] as string
    );
    return res.status(ERROR_STATUS_MAPPING[ErrorCode.INVALID_INPUT_FORMAT]).json(errorResponse);
  }

  // Mongoose duplicate key
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const errorResponse = createErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      'Bu veri zaten mevcut',
      { field: 'duplicate' },
      req.headers['x-request-id'] as string
    );
    return res.status(ERROR_STATUS_MAPPING[ErrorCode.ALREADY_EXISTS]).json(errorResponse);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values((err as any).errors).map((val: any) => ({
      field: val.path,
      message: val.message
    }));
    const errorResponse = createErrorResponse(
      ErrorCode.VALIDATION_FAILED,
      'Veri doğrulama hatası',
      details,
      req.headers['x-request-id'] as string
    );
    return res.status(ERROR_STATUS_MAPPING[ErrorCode.VALIDATION_FAILED]).json(errorResponse);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const errorResponse = createErrorResponse(
      ErrorCode.INVALID_TOKEN,
      'Geçersiz token',
      null,
      req.headers['x-request-id'] as string
    );
    return res.status(ERROR_STATUS_MAPPING[ErrorCode.INVALID_TOKEN]).json(errorResponse);
  }

  if (err.name === 'TokenExpiredError') {
    const errorResponse = createErrorResponse(
      ErrorCode.TOKEN_EXPIRED,
      'Token süresi dolmuş',
      null,
      req.headers['x-request-id'] as string
    );
    return res.status(ERROR_STATUS_MAPPING[ErrorCode.TOKEN_EXPIRED]).json(errorResponse);
  }

  // Custom error with error code
  if (err instanceof CustomError) {
    const errorResponse = createErrorResponse(
      err.errorCode,
      err.message,
      null,
      req.headers['x-request-id'] as string
    );
    return res.status(err.statusCode).json(errorResponse);
  }

  // Default error
  const errorResponse = createErrorResponse(
    ErrorCode.INTERNAL_SERVER_ERROR,
    'Sunucu hatası oluştu',
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null,
    req.headers['x-request-id'] as string
  );
  
  res.status(500).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found middleware
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const errorResponse = createErrorResponse(
    ErrorCode.NOT_FOUND,
    `Endpoint bulunamadı: ${req.originalUrl}`,
    { url: req.originalUrl, method: req.method },
    req.headers['x-request-id'] as string
  );
  res.status(404).json(errorResponse);
};
